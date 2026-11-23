import { useCallback, useState } from "react";
import { z } from "zod";
import { readStored, writeStored } from "../lib/storage.ts";

const STORAGE_KEY = "trainingDone";
const doneSchema = z.array(z.number().int());

/** Levels whose orders offer their training first, until it is filed or skipped. */
const NEW_RULE_LEVELS = [1, 2, 3];

/**
 * Which training records this browser has filed or skipped. Until then, the orders of a level
 * with a new rule (I, II, III) put "Start training" first. A per-viewer convenience in
 * localStorage: if storage is blocked the training is offered again next time, which costs nothing.
 */
export function useTrainingDone() {
  const [done, setDone] = useState(() => readStored(STORAGE_KEY, doneSchema, []));

  const markDone = useCallback(
    (level: number) => {
      if (done.includes(level)) return;
      const next = [...done, level];
      setDone(next);
      writeStored(STORAGE_KEY, next);
    },
    [done],
  );

  /** Whether `level`'s orders should offer its training before the record. */
  const trainingFirst = useCallback(
    (level: number) => NEW_RULE_LEVELS.includes(level) && !done.includes(level),
    [done],
  );

  return { markDone, trainingFirst };
}
