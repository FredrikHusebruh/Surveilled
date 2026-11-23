import { requestJson } from "./client.ts";
import {
  trainingClearResponseSchema,
  trainingHintResponseSchema,
  trainingOpenResponseSchema,
  trainingSchema,
  type Training,
  type TrainingClearResponse,
  type TrainingHintResponse,
  type TrainingOpenResponse,
  type ShowHintKind,
} from "./schemas.ts";

/**
 * Typed calls for training records: practice games the server plays with the real rules and
 * never counts. `level` is the record of the day the training prepares for (1 to 4).
 */

/** Deals a fresh game of the training record, replacing any earlier one. */
export function startTraining(level: number): Promise<Training> {
  return requestJson(trainingPath(level, "start"), trainingSchema, { method: "POST" });
}

export function clearTrainingCell(level: number, cell: number): Promise<TrainingClearResponse> {
  return requestJson(trainingPath(level, "clear"), trainingClearResponseSchema, {
    method: "POST",
    body: { cell },
  });
}

export function toggleTrainingMark(level: number, cell: number): Promise<Training> {
  return requestJson(trainingPath(level, "mark"), trainingSchema, { method: "POST", body: { cell } });
}

export function toggleTrainingStamp(level: number, cell: number): Promise<Training> {
  return requestJson(trainingPath(level, "stamp"), trainingSchema, { method: "POST", body: { cell } });
}

/** The Camera or Safe cell hint on the training record. Free and unlimited, unlike the day's. */
export function requestTrainingHint(level: number, kind: ShowHintKind): Promise<TrainingHintResponse> {
  return requestJson(trainingPath(level, "hint"), trainingHintResponseSchema, { method: "POST", body: { kind } });
}

/** The Open hint on the training record: free and unlimited. */
export function openTrainingCell(level: number, cell: number): Promise<TrainingOpenResponse> {
  return requestJson(trainingPath(level, "open"), trainingOpenResponseSchema, { method: "POST", body: { cell } });
}

function trainingPath(level: number, action: string): string {
  return `/api/training/${level}/${action}`;
}
