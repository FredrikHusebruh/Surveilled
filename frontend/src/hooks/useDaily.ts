import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearCell,
  fetchDaily,
  requestHint,
  resetDay,
  startLevel,
  toggleMark,
  toggleStamp,
} from "../api/daily.ts";
import type { Daily, Game, Level } from "../api/schemas.ts";
import { isNumbered, isUnrevealed } from "../game/board.ts";
import {
  CASCADE_MESSAGE,
  MARKED_CELL_MESSAGE,
  OUT_MESSAGE,
  PREPARING_MESSAGE,
  TOPPLED_MESSAGE,
  defaultMessage,
  failureMessage,
  hintMessage,
  seenMessage,
  sightMessage,
} from "../game/copy.ts";
import { useLocalDay } from "./useLocalDay.ts";
import { useSerialTasks } from "./useSerialTasks.ts";
import { useStreak } from "./useStreak.ts";

/** What a plain tap on a hidden cell does. */
export type TapMode = "clear" | "mark";

export type Message = { text: string; alert: boolean };

/** A strike or a loss to dramatise. `id` changes with every event, so animations replay. */
export type Alarm = { kind: "strike" | "loss"; id: number };

type Session = { daily: Daily; receivedAt: number };

const say = (text: string): Message => ({ text, alert: false });

/**
 * The daily game controller. It holds the server's latest view of the player's day plus the
 * UI-only state around it (which level is shown, tap mode, selected number, hinted cell, message
 * line, alarms) and turns input into API calls. Every rule is enforced by the server.
 *
 * The day is the player's local date. When it turns over at midnight the controller moves to the
 * new day, unless a record is in progress: that one can still be finished, then the day moves on.
 */
export function useDaily() {
  const today = useLocalDay();
  const [session, setSession] = useState<Session | null>(null);
  const [viewed, setViewed] = useState<number | null>(null);
  const [mode, setMode] = useState<TapMode>("clear");
  const [selected, setSelected] = useState<number | null>(null);
  const [hinted, setHinted] = useState<number | null>(null);
  const [message, setMessage] = useState<Message>(say(PREPARING_MESSAGE));
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const alarmCount = useRef(0);
  const streak = useStreak(today);
  const { recordTopple } = streak;

  const reportFailure = useCallback((error: unknown) => {
    console.error(error);
    setMessage({ text: failureMessage(error), alert: true });
  }, []);
  const { pending, run } = useSerialTasks(reportFailure);

  const daily = session?.daily ?? null;
  // Stay on an older day only while one of its records is still in progress.
  const holdingOldDay = daily !== null && daily.day !== today && daily.levels.some((l) => l.state === "playing");
  const day = holdingOldDay ? daily.day : today;
  const dayRef = useRef(day);
  const levelId = daily === null ? null : (viewed ?? defaultLevel(daily));
  const level = daily === null || levelId === null ? null : daily.levels[levelId - 1];
  const game = level?.game ?? null;

  /** Keep a server response, unless the player has already moved on to another day. */
  const adopt = useCallback((next: Daily) => {
    if (next.day !== dayRef.current) return;
    setSession({ daily: next, receivedAt: Date.now() });
  }, []);

  useEffect(() => {
    dayRef.current = day;
    let current = true;
    fetchDaily(day).then(
      (loaded) => {
        if (!current) return;
        adopt(loaded);
        setViewed(null);
        setSelected(null);
        setHinted(null);
        setMessage(arrivalMessage(loaded, loaded.levels[defaultLevel(loaded) - 1]));
      },
      (error: unknown) => {
        if (current) reportFailure(error);
      },
    );
    return () => {
      current = false;
    };
  }, [day, adopt, reportFailure]);

  const outcome = daily?.outcome;
  const loadedDay = daily?.day;
  useEffect(() => {
    if (outcome === "toppled" && loadedDay !== undefined) recordTopple(loadedDay);
  }, [outcome, loadedDay, recordTopple]);

  const viewLevel = useCallback(
    (id: number) => {
      if (daily === null) return;
      const target = daily.levels[id - 1];
      if (target.state === "locked") return;
      setViewed(id);
      setSelected(null);
      setHinted(null);
      setMessage(arrivalMessage(daily, target));
    },
    [daily],
  );

  /** Opens a level and starts its clock. */
  const openLevel = useCallback(
    (id: number) => {
      void run(async () => {
        const next = await startLevel(day, id);
        adopt(next);
        setViewed(id);
        setSelected(null);
        setHinted(null);
        const opened = next.levels[id - 1].game;
        setMessage(say(opened === null ? "" : defaultMessage(opened.lies)));
      });
    },
    [day, run, adopt],
  );

  const toggleSelect = useCallback(
    (current: Game, cell: number) => {
      const next = selected === cell ? null : cell;
      setSelected(next);
      setMessage(say(next === null ? defaultMessage(current.lies) : sightMessage(current, cell)));
    },
    [selected],
  );

  /** A mark-mode tap, long-press, right-click or `m`: stamps Party records, marks hidden cells. */
  const markCell = useCallback(
    (cell: number) => {
      if (game === null || game.status !== "play" || levelId === null) return;
      const target = game.cells[cell];
      if (target.kind === "given" && game.lies) {
        void run(async () => adopt(await toggleStamp(day, levelId, cell)));
      } else if (isNumbered(target)) {
        toggleSelect(game, cell);
      } else if (isUnrevealed(target)) {
        void run(async () => {
          adopt(await toggleMark(day, levelId, cell));
          if (hinted === cell) setHinted(null);
        });
      }
    },
    [game, levelId, day, hinted, run, adopt, toggleSelect],
  );

  /** A plain tap: selects numbers, otherwise clears or marks depending on the mode. */
  const tapCell = useCallback(
    (cell: number) => {
      if (game === null || game.status !== "play" || levelId === null) return;
      if (mode === "mark") {
        markCell(cell);
        return;
      }
      const target = game.cells[cell];
      if (isNumbered(target)) {
        toggleSelect(game, cell);
      } else if (target.kind === "marked") {
        setMessage(say(MARKED_CELL_MESSAGE));
      } else if (target.kind === "hidden") {
        void run(async () => {
          const { daily: next, outcome: cleared } = await clearCell(day, levelId, cell);
          adopt(next);
          setHinted(null);
          const after = next.levels[levelId - 1].game;
          if (after === null) throw new Error("The cleared record is missing from the day.");
          if (cleared === "seen") {
            const lost = after.status === "lost";
            alarmCount.current += 1;
            setAlarm({ kind: lost ? "loss" : "strike", id: alarmCount.current });
            setMessage(lost ? say(OUT_MESSAGE) : { text: seenMessage(after.strikes, after.maxStrikes), alert: true });
            return;
          }
          setSelected(null);
          if (after.status === "won") setMessage(say(""));
          else setMessage(say(cleared === "cascade" ? CASCADE_MESSAGE : defaultMessage(after.lies)));
        });
      }
    },
    [game, levelId, mode, day, run, adopt, markCell, toggleSelect],
  );

  const takeHint = useCallback(() => {
    if (game === null || game.status !== "play" || levelId === null) return;
    void run(async () => {
      const { daily: next, hint } = await requestHint(day, levelId);
      adopt(next);
      if (hint.kind === "clue") {
        setSelected(hint.clueCell);
        setHinted(hint.cell);
      } else if (hint.kind === "deduction") {
        setSelected(null);
        setHinted(hint.cell);
      } else if (hint.kind === "wrong_mark") {
        setHinted(hint.cell);
      }
      setMessage(say(hintMessage(hint, game.lies)));
    });
  }, [game, levelId, day, run, adopt]);

  /** Developer tool: wipe today's progress, lock-out included. Needs SURVEILLED_DEV_MODE. */
  const resetToday = useCallback(() => {
    void run(async () => {
      const fresh = await resetDay(day);
      adopt(fresh);
      setViewed(null);
      setSelected(null);
      setHinted(null);
      setMessage(say("Day reset."));
    });
  }, [day, run, adopt]);

  return {
    daily,
    receivedAt: session?.receivedAt ?? 0,
    pending,
    level,
    game,
    mode,
    setMode,
    selected,
    hinted,
    message,
    alarm,
    streakDays: streak.days,
    notify: setMessage,
    viewLevel,
    openLevel,
    tapCell,
    markCell,
    takeHint,
    resetToday,
  };
}

/** The level to show when the player hasn't picked one: the one in play, else the last played. */
function defaultLevel(daily: Daily): number {
  const live = daily.levels.find((l) => l.state === "playing" || l.state === "open");
  if (live !== undefined) return live.level;
  const played = daily.levels.filter((l) => l.game !== null);
  return played.at(-1)?.level ?? 1;
}

/** The message line for a level as it comes into view. */
function arrivalMessage(daily: Daily, level: Level): Message {
  if (level.state === "open") return say("");
  if (level.state === "playing" && level.game !== null) return say(defaultMessage(level.game.lies));
  if (daily.outcome === "out") return say(OUT_MESSAGE);
  if (daily.outcome === "toppled") return say(TOPPLED_MESSAGE);
  return say("");
}
