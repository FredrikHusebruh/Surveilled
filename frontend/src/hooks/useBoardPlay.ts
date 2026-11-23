import { useCallback, useRef, useState } from "react";
import type { ClearOutcome, Game, Hint, HintKind, OpenOutcome, ShowHintKind } from "../api/schemas.ts";
import { cellAction, isUnrevealed, revealDelays, type Gesture } from "../game/board.ts";
import {
  CASCADE_MESSAGE,
  OPEN_CHOOSE_MESSAGE,
  defaultMessage,
  hintMessage,
  markedCellMessage,
  openMessage,
  seenMessage,
  sightMessage,
} from "../game/copy.ts";
import { ringBell, seen, shutter, stampThud, tick, typeKeys, wakeSound } from "../lib/sound.ts";
import { usePointer } from "./usePointer.ts";

export type Message = { text: string; alert: boolean };

/** A strike or a loss to dramatise. `id` changes with every event, so animations replay. */
export type Alarm = { kind: "strike" | "loss"; id: number };

/** How long after the last keystroke the carriage bell rings for a filed record, in ms. */
const BELL_AFTER_MS = 180;

export const say = (text: string): Message => ({ text, alert: false });

/** The server calls behind a board: each sends one move and answers with the game after it. */
export type BoardMoves = {
  clear: (cell: number) => Promise<{ game: Game; outcome: ClearOutcome }>;
  mark: (cell: number) => Promise<Game>;
  stamp: (cell: number) => Promise<Game>;
  hint: (kind: ShowHintKind) => Promise<{ game: Game; hint: Hint }>;
  /** The Open hint on the chosen cell. */
  open: (cell: number) => Promise<{ game: Game; outcome: OpenOutcome }>;
};

type Options = {
  game: Game | null;
  moves: BoardMoves;
  /** Runs a move, one at a time (`useSerialTasks`); failures are reported there. */
  run: (task: () => Promise<void>) => Promise<void>;
  setMessage: (message: Message) => void;
  /** The message line once the record is lost. */
  lostMessage: string;
};

/**
 * Playing one board: the selected number, the hinted cell, the alarms, choosing a cell for the
 * Open hint, and turning taps into server moves with the message line that answers them. The daily records and the
 * training records share it, so both boards behave exactly alike. Every rule stays on the server.
 */
export function useBoardPlay({ game, moves, run, setMessage, lostMessage }: Options) {
  const pointer = usePointer();
  const [selected, setSelected] = useState<number | null>(null);
  const [hinted, setHinted] = useState<number | null>(null);
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  /** Open was pressed: the next tap on a hidden or marked cell opens it. */
  const [opening, setOpening] = useState(false);
  /** The cells the last move opened, each with its delay in ms before it is typed in. */
  const [reveal, setReveal] = useState<ReadonlyMap<number, number> | null>(null);
  /** The cell the last move marked as a camera or stamped False, so only it animates. */
  const [justMarked, setJustMarked] = useState<number | null>(null);
  const alarmCount = useRef(0);

  /** Forget the selection, the hint and the last opening, as when another board comes into view. */
  const resetBoard = useCallback(() => {
    setSelected(null);
    setHinted(null);
    setOpening(false);
    setReveal(null);
    setJustMarked(null);
  }, []);

  /** Type the cells a move opened onto the record, with their keystrokes, and ring a filed record's bell. */
  const typeIn = useCallback((before: Game, after: Game, cell: number) => {
    const delays = revealDelays(before, after, cell);
    setReveal(delays);
    typeKeys(delays.values());
    if (after.status === "won") ringBell(Math.max(...delays.values()) + BELL_AFTER_MS);
  }, []);

  const toggleSelect = useCallback(
    (current: Game, cell: number) => {
      const next = selected === cell ? null : cell;
      setSelected(next);
      setMessage(say(next === null ? defaultMessage(current.lies) : sightMessage(current, cell)));
    },
    [selected, setMessage],
  );

  /**
   * A tap or a mark gesture on a cell. Which move it asks for comes from `cellAction`: numbers are
   * selected, Party records stamped, hidden cells cleared by a tap or marked by the mark gesture.
   */
  const act = useCallback(
    (cell: number, gesture: Gesture) => {
      if (game === null || game.status !== "play") return;
      wakeSound();
      setJustMarked(null);
      if (opening) {
        // Choosing a cell for Open: a tap on a hidden or marked cell opens it; anything else
        // cancels the choice and acts as usual.
        setOpening(false);
        if (gesture === "tap" && isUnrevealed(game.cells[cell])) {
          void run(async () => {
            const { game: after, outcome } = await moves.open(cell);
            if (outcome === "marked") {
              setJustMarked(cell);
              shutter();
            } else {
              typeIn(game, after, cell);
            }
            setHinted(null);
            setSelected(null);
            setMessage(say(after.status === "won" ? "" : openMessage(outcome, after.lies)));
          });
          return;
        }
      }
      setReveal(null);
      switch (cellAction(game.cells[cell], gesture, game.lies)) {
        case "select":
          toggleSelect(game, cell);
          return;
        case "stamp":
          void run(async () => {
            const after = await moves.stamp(cell);
            const stamped = after.cells[cell];
            if (stamped.kind === "given" && stamped.stamped) {
              setJustMarked(cell);
              stampThud();
            } else {
              tick();
            }
          });
          return;
        case "mark":
          void run(async () => {
            const after = await moves.mark(cell);
            if (hinted === cell) setHinted(null);
            if (after.cells[cell].kind === "marked") {
              setJustMarked(cell);
              shutter();
            } else {
              tick();
            }
          });
          return;
        case "tapMarked":
          setMessage(say(markedCellMessage(pointer)));
          return;
        case "clear":
          void run(async () => {
            const { game: after, outcome } = await moves.clear(cell);
            setHinted(null);
            if (outcome !== "seen") typeIn(game, after, cell);
            if (outcome === "seen") {
              const lost = after.status === "lost";
              seen(lost);
              alarmCount.current += 1;
              setAlarm({ kind: lost ? "loss" : "strike", id: alarmCount.current });
              setMessage(lost ? say(lostMessage) : { text: seenMessage(after.strikes, after.maxStrikes), alert: true });
              return;
            }
            setSelected(null);
            if (after.status === "won") setMessage(say(""));
            else setMessage(say(outcome === "cascade" ? CASCADE_MESSAGE : defaultMessage(after.lies)));
          });
          return;
        case "none":
          return;
      }
    },
    [game, opening, pointer, hinted, moves, run, setMessage, lostMessage, toggleSelect, typeIn],
  );

  /**
   * A hint button. Open waits for the player to choose a cell (pressing it again cancels);
   * Camera and Safe cell outline one, with what proves it when something does.
   */
  const takeHint = useCallback(
    (kind: HintKind) => {
      if (game === null || game.status !== "play") return;
      setReveal(null);
      setJustMarked(null);
      if (kind === "open") {
        setOpening(!opening);
        setMessage(say(opening ? defaultMessage(game.lies) : OPEN_CHOOSE_MESSAGE));
        return;
      }
      setOpening(false);
      void run(async () => {
        const { hint } = await moves.hint(kind);
        if (hint.kind === "clue") {
          setSelected(hint.clueCell);
          setHinted(hint.cell);
        } else if (hint.kind !== "none") {
          setSelected(null);
          setHinted(hint.cell);
        }
        setMessage(say(hintMessage(hint, game.lies)));
      });
    },
    [game, opening, moves, run, setMessage],
  );

  return {
    selected,
    hinted,
    alarm,
    opening,
    reveal,
    justMarked,
    resetBoard,
    act,
    /** A plain tap: selects numbers, clears hidden cells. */
    tapCell: useCallback((cell: number) => act(cell, "tap"), [act]),
    /** A long-press, right-click or `m`: stamps Party records, marks hidden cells. */
    markCell: useCallback((cell: number) => act(cell, "mark"), [act]),
    takeHint,
  };
}
