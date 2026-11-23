import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearCell,
  fetchDaily,
  openCell,
  requestHint,
  resetDay,
  startLevel,
  toggleMark,
  toggleStamp,
} from "../api/daily.ts";
import type { Daily, Game, Level } from "../api/schemas.ts";
import {
  OUT_MESSAGE,
  PREPARING_MESSAGE,
  TOPPLED_MESSAGE,
  defaultMessage,
  failureMessage,
} from "../game/copy.ts";
import { say, useBoardPlay, type BoardMoves, type Message } from "./useBoardPlay.ts";
import { useLocalDay } from "./useLocalDay.ts";
import { useSerialTasks } from "./useSerialTasks.ts";
import { useStreak } from "./useStreak.ts";

type Session = { daily: Daily; receivedAt: number };

/**
 * The daily game controller. It holds the server's latest view of the player's day plus the
 * UI-only state around it (which level is shown and the message line) and turns input into API
 * calls; playing the board itself is `useBoardPlay`. Every rule is enforced by the server.
 *
 * The day is the player's local date. When it turns over at midnight the controller moves to the
 * new day, unless a record is in progress: that one can still be finished, then the day moves on.
 */
export function useDaily() {
  const today = useLocalDay();
  const [session, setSession] = useState<Session | null>(null);
  const [viewed, setViewed] = useState<number | null>(null);
  const [message, setMessage] = useState<Message>(say(PREPARING_MESSAGE));
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

  const moves = useMemo<BoardMoves>(() => {
    const id = levelId ?? 0;
    const gameIn = (next: Daily): Game => {
      const played = next.levels[id - 1]?.game ?? null;
      if (played === null) throw new Error("The played record is missing from the day.");
      return played;
    };
    return {
      clear: async (cell) => {
        const { daily: next, outcome } = await clearCell(day, id, cell);
        adopt(next);
        return { game: gameIn(next), outcome };
      },
      mark: async (cell) => {
        const next = await toggleMark(day, id, cell);
        adopt(next);
        return gameIn(next);
      },
      stamp: async (cell) => {
        const next = await toggleStamp(day, id, cell);
        adopt(next);
        return gameIn(next);
      },
      hint: async (kind) => {
        const { daily: next, hint } = await requestHint(day, id, kind);
        adopt(next);
        return { game: gameIn(next), hint };
      },
      open: async (cell) => {
        const { daily: next, outcome } = await openCell(day, id, cell);
        adopt(next);
        return { game: gameIn(next), outcome };
      },
    };
  }, [day, levelId, adopt]);

  const board = useBoardPlay({ game, moves, run, setMessage, lostMessage: OUT_MESSAGE });
  const { resetBoard } = board;

  useEffect(() => {
    dayRef.current = day;
    let current = true;
    fetchDaily(day).then(
      (loaded) => {
        if (!current) return;
        adopt(loaded);
        setViewed(null);
        resetBoard();
        setMessage(arrivalMessage(loaded, loaded.levels[defaultLevel(loaded) - 1]));
      },
      (error: unknown) => {
        if (current) reportFailure(error);
      },
    );
    return () => {
      current = false;
    };
  }, [day, adopt, reportFailure, resetBoard]);

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
      resetBoard();
      setMessage(arrivalMessage(daily, target));
    },
    [daily, resetBoard],
  );

  /** Opens a level and starts its clock. */
  const openLevel = useCallback(
    (id: number) => {
      void run(async () => {
        const next = await startLevel(day, id);
        adopt(next);
        setViewed(id);
        resetBoard();
        const opened = next.levels[id - 1].game;
        setMessage(say(opened === null ? "" : defaultMessage(opened.lies)));
      });
    },
    [day, run, adopt, resetBoard],
  );

  /** Developer tool: wipe today's progress, lock-out included. Needs SURVEILLED_DEV_MODE. */
  const resetToday = useCallback(() => {
    void run(async () => {
      const fresh = await resetDay(day);
      adopt(fresh);
      setViewed(null);
      resetBoard();
      setMessage(say("Day reset."));
    });
  }, [day, run, adopt, resetBoard]);

  return {
    daily,
    receivedAt: session?.receivedAt ?? 0,
    pending,
    level,
    game,
    selected: board.selected,
    hinted: board.hinted,
    message,
    alarm: board.alarm,
    opening: board.opening,
    reveal: board.reveal,
    justMarked: board.justMarked,
    streakDays: streak.days,
    notify: setMessage,
    viewLevel,
    openLevel,
    tapCell: board.tapCell,
    markCell: board.markCell,
    takeHint: board.takeHint,
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
