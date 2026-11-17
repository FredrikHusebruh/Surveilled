import { useCallback, useEffect, useState } from "react";

// A beat to see the filed board; after a loss, long enough for the siren and the revealed cameras.
const AFTER_FILED_MS = 700;
const AFTER_SEEN_MS = 3300;

/**
 * Whether the Archivist's report sheet is up. `reportKey` names a closed record (null while it is
 * in play). Each closed record's report opens on its own once, after a pause; the player can close
 * it and bring it back with Show report.
 */
export function useReport(reportKey: string | null, seen: boolean) {
  const [shown, setShown] = useState<string | null>(null);
  const [delivered, setDelivered] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (reportKey === null || delivered.has(reportKey)) return;
    const timer = window.setTimeout(
      () => {
        setShown(reportKey);
        setDelivered((current) => new Set(current).add(reportKey));
      },
      seen ? AFTER_SEEN_MS : AFTER_FILED_MS,
    );
    return () => window.clearTimeout(timer);
  }, [reportKey, seen, delivered]);

  const show = useCallback(() => setShown(reportKey), [reportKey]);
  const hide = useCallback(() => setShown(null), []);

  return { open: reportKey !== null && shown === reportKey, show, hide };
}
