import { useEffect, useState } from "react";
import { ApiError } from "../api/client.ts";
import { recordStanding } from "../api/daily.ts";
import type { Standing } from "../api/schemas.ts";

export type StandingState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; standing: Standing }
  | { status: "unavailable"; reason: string };

type Result = { day: string; state: StandingState };

const UNAVAILABLE = "Rankings are unavailable right now. Try again later.";

/**
 * How the player's finished day compares with everyone else's. `day` is the finished day (null
 * while the day is in play). The standing is fetched each time `active` turns on (the report
 * opening), because players in later time zones keep finishing the same day for hours, so the
 * numbers move. The server records the day the first time; asking again changes nothing.
 */
export function useStanding(day: string | null, active: boolean): StandingState {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (day === null || !active) return;
    let current = true;
    recordStanding(day).then(
      (standing) => {
        if (current) setResult({ day, state: { status: "ready", standing } });
      },
      (error: unknown) => {
        console.error(error);
        const reason = error instanceof ApiError && error.status === 503 ? error.message : UNAVAILABLE;
        if (current) setResult({ day, state: { status: "unavailable", reason } });
      },
    );
    return () => {
      current = false;
    };
  }, [day, active]);

  if (day === null) return { status: "idle" };
  // Until this day's first answer arrives; later refreshes keep showing the last answer.
  if (result?.day !== day) return { status: "loading" };
  return result.state;
}
