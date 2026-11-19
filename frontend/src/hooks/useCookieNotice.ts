import { useCallback, useState } from "react";
import { z } from "zod";
import { readStored, writeStored } from "../lib/storage.ts";

const STORAGE_KEY = "cookieNoticeAcknowledged";

/**
 * Whether to show the cookie notice. The game's only cookie is strictly necessary, so this is
 * information, not a consent gate: the game plays either way. Once acknowledged it stays hidden in
 * this browser (a per-viewer convenience in localStorage; if storage is blocked it shows again).
 */
export function useCookieNotice() {
  const [acknowledged, setAcknowledged] = useState(() => readStored(STORAGE_KEY, z.boolean(), false));

  const acknowledge = useCallback(() => {
    setAcknowledged(true);
    writeStored(STORAGE_KEY, true);
  }, []);

  return { visible: !acknowledged, acknowledge };
}
