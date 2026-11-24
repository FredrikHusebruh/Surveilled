import { requestJson } from "./client.ts";
import {
  clearResponseSchema,
  dailySchema,
  hintResponseSchema,
  openResponseSchema,
  standingSchema,
  type ClearResponse,
  type Daily,
  type HintResponse,
  type OpenResponse,
  type ShowHintKind,
  type Standing,
} from "./schemas.ts";

/**
 * Typed calls for the daily game. `day` is the player's local date (YYYY-MM-DD). The player is
 * identified by an httpOnly cookie the server sets, which fetch sends on same-origin requests.
 * The server owns the rules; these only carry moves.
 */

export function fetchDaily(day: string): Promise<Daily> {
  return requestJson(dayPath(day), dailySchema);
}

/**
 * Once the day is over: records it (the server scores it from its own run; the first record
 * stands) and returns how it compares with everyone who has finished the same day so far.
 */
export function recordStanding(day: string): Promise<Standing> {
  return requestJson(`${dayPath(day)}/standing`, standingSchema, { method: "POST" });
}

/** Opens a level and starts its clock. Opening one that is already open changes nothing. */
export function startLevel(day: string, level: number): Promise<Daily> {
  return requestJson(levelPath(day, level, "start"), dailySchema, { method: "POST" });
}

/** Developer tool: forgets this browser's progress on `day`. 404 unless the backend is in dev mode. */
export function resetDay(day: string): Promise<Daily> {
  return requestJson(dayPath(day), dailySchema, { method: "DELETE" });
}

export function clearCell(day: string, level: number, cell: number): Promise<ClearResponse> {
  return requestJson(levelPath(day, level, "clear"), clearResponseSchema, {
    method: "POST",
    body: { cell },
  });
}

export function toggleMark(day: string, level: number, cell: number): Promise<Daily> {
  return requestJson(levelPath(day, level, "mark"), dailySchema, { method: "POST", body: { cell } });
}

export function toggleStamp(day: string, level: number, cell: number): Promise<Daily> {
  return requestJson(levelPath(day, level, "stamp"), dailySchema, { method: "POST", body: { cell } });
}

/** The Camera or Safe hint: where a camera, or a safe cell, is. One of each a day. */
export function requestHint(day: string, level: number, kind: ShowHintKind): Promise<HintResponse> {
  return requestJson(levelPath(day, level, "hint"), hintResponseSchema, { method: "POST", body: { kind } });
}

/** The Open hint: open a cell the player chose. A camera is marked, with no strike. One a day. */
export function openCell(day: string, level: number, cell: number): Promise<OpenResponse> {
  return requestJson(levelPath(day, level, "open"), openResponseSchema, { method: "POST", body: { cell } });
}

function dayPath(day: string): string {
  return `/api/daily/${encodeURIComponent(day)}`;
}

function levelPath(day: string, level: number, action: string): string {
  return `${dayPath(day)}/levels/${level}/${action}`;
}
