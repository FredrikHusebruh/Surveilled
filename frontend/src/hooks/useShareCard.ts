import { useCallback } from "react";
import type { Daily, Standing } from "../api/schemas.ts";
import { SHARE_COPIED, SHARE_FAILED } from "../game/copy.ts";
import { shareText } from "../game/share.ts";
import { shareOrCopy } from "../lib/shareSheet.ts";
import type { Message } from "./useBoardPlay.ts";

/**
 * The day's result card once the day is over (null before), and the action that shares it.
 * The standing line joins the card once the standing has arrived. `notify` puts feedback on the
 * message line.
 */
export function useShareCard(
  daily: Daily | null,
  streakDays: number,
  standing: Standing | null,
  notify: (message: Message) => void,
) {
  const card =
    daily !== null && daily.outcome !== "playing"
      ? shareText(daily, streakDays, window.location.origin, standing)
      : null;

  const share = useCallback(() => {
    if (card === null) return;
    shareOrCopy(card).then(
      (result) => {
        if (result === "copied") notify({ text: SHARE_COPIED, alert: false });
      },
      (error: unknown) => {
        console.error(error);
        notify({ text: SHARE_FAILED, alert: true });
      },
    );
  }, [card, notify]);

  return { card, share };
}
