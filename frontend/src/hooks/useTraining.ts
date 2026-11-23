import { useCallback, useEffect, useMemo, useState } from "react";
import type { HintKind, Training } from "../api/schemas.ts";
import {
  clearTrainingCell,
  openTrainingCell,
  requestTrainingHint,
  startTraining,
  toggleTrainingMark,
  toggleTrainingStamp,
} from "../api/training.ts";
import { cellAction, type Gesture } from "../game/board.ts";
import { TRAINING, failureMessage, wrongMove } from "../game/copy.ts";
import { guidedMove, guidesDone } from "../game/training.ts";
import { say, useBoardPlay, type BoardMoves, type Message } from "./useBoardPlay.ts";
import { usePointer } from "./usePointer.ts";
import { useSerialTasks } from "./useSerialTasks.ts";

/**
 * The controller for one training record. It deals a fresh game from the server, then plays it
 * with the same board logic as the daily records. While a guided move is pending, only that move
 * goes through (anything else gets a line saying why); once the guides are done the player plays
 * freely. `onFiled` runs when the record is filed. Every rule stays on the server.
 */
export function useTraining(level: number, onFiled: (level: number) => void) {
  const [training, setTraining] = useState<Training | null>(null);
  const [selectedGuides, setSelectedGuides] = useState<ReadonlySet<number>>(new Set());
  const [message, setMessage] = useState<Message>(say(""));
  const pointer = usePointer();

  const reportFailure = useCallback((error: unknown) => {
    console.error(error);
    setMessage({ text: failureMessage(error), alert: true });
  }, []);
  const { pending, run } = useSerialTasks(reportFailure);

  const current = training?.level === level ? training : null;
  const game = current?.game ?? null;

  const moves = useMemo<BoardMoves>(
    () => ({
      clear: async (cell) => {
        const { training: next, outcome } = await clearTrainingCell(level, cell);
        setTraining(next);
        if (next.game.status === "won") onFiled(level);
        return { game: next.game, outcome };
      },
      mark: async (cell) => {
        const next = await toggleTrainingMark(level, cell);
        setTraining(next);
        return next.game;
      },
      stamp: async (cell) => {
        const next = await toggleTrainingStamp(level, cell);
        setTraining(next);
        return next.game;
      },
      hint: async (kind) => {
        const { training: next, hint } = await requestTrainingHint(level, kind);
        setTraining(next);
        return { game: next.game, hint };
      },
      open: async (cell) => {
        const { training: next, outcome } = await openTrainingCell(level, cell);
        setTraining(next);
        if (next.game.status === "won") onFiled(level);
        return { game: next.game, outcome };
      },
    }),
    [level, onFiled],
  );

  const board = useBoardPlay({ game, moves, run, setMessage, lostMessage: TRAINING.lost });
  const { resetBoard, act, takeHint } = board;

  /** Deal a fresh game: on opening, and again after the record is lost. */
  const restart = useCallback(() => {
    void run(async () => {
      const fresh = await startTraining(level);
      setTraining(fresh);
      setSelectedGuides(new Set());
      resetBoard();
      setMessage(say(""));
    });
  }, [level, run, resetBoard]);

  useEffect(() => {
    restart();
  }, [restart]);

  const guides = current?.guides ?? [];
  const guideIndex = game === null ? 0 : guidesDone(guides, game, selectedGuides);
  const guide = game?.status === "play" ? (guides[guideIndex] ?? null) : null;

  const gated = useCallback(
    (cell: number, gesture: Gesture) => {
      if (game === null || game.status !== "play") return;
      if (guide !== null) {
        const reply = guidedMove(guide, cell, cellAction(game.cells[cell], gesture, game.lies));
        if (reply === "ignore") return;
        if (reply === "wrongCell") {
          setMessage(say(TRAINING.wrongCell));
          return;
        }
        if (reply === "wrongMove") {
          setMessage(say(wrongMove(guide.action, pointer)));
          return;
        }
        // The right move: drop any earlier nudge; the move's own answer follows.
        setMessage(say(""));
        if (guide.action === "select") setSelectedGuides((done) => new Set([...done, guideIndex]));
      }
      act(cell, gesture);
      // The card already explains a guided number, so its line under the board stays empty.
      if (guide?.action === "select") setMessage(say(""));
    },
    [game, guide, guideIndex, act, pointer],
  );

  return {
    game,
    pending,
    message,
    /** Which guided move is pending (its index in the training's words), or null in free play. */
    guideIndex: guide === null ? null : guideIndex,
    selected: board.selected,
    /** The guided cell while a guide is pending, else the hinted cell. */
    outlined: guide?.cell ?? board.hinted,
    alarm: board.alarm,
    opening: board.opening,
    reveal: board.reveal,
    justMarked: board.justMarked,
    tapCell: useCallback((cell: number) => gated(cell, "tap"), [gated]),
    markCell: useCallback((cell: number) => gated(cell, "mark"), [gated]),
    /** Free in training, but only once the guided moves are done: they are the lesson. */
    takeHint: useCallback(
      (kind: HintKind) => {
        if (guide === null) takeHint(kind);
        else setMessage(say(TRAINING.wrongCell));
      },
      [guide, takeHint],
    ),
    restart,
  };
}
