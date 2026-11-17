import { useCallback, useRef, useState } from "react";

/**
 * Runs async tasks one at a time. Input that arrives while a task is in flight is dropped, so a
 * double tap can't send two moves computed from the same, stale game. Failures go to `onFailure`.
 */
export function useSerialTasks(onFailure: (error: unknown) => void) {
  const runningRef = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async (task: () => Promise<void>): Promise<void> => {
      if (runningRef.current) return;
      runningRef.current = true;
      setPending(true);
      try {
        await task();
      } catch (error) {
        onFailure(error);
      } finally {
        runningRef.current = false;
        setPending(false);
      }
    },
    [onFailure],
  );

  return { pending, run };
}
