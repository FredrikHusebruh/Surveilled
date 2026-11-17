import { z } from "zod";

/**
 * Wire shapes for the Surveilled API, mirroring backend/app/schemas. Every response is parsed
 * through these before use, so a backend change that breaks the contract fails loudly here.
 */

export const cellSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("wall") }),
  z.object({ kind: z.literal("hidden") }),
  z.object({ kind: z.literal("marked"), wrong: z.boolean() }),
  z.object({ kind: z.literal("exposed") }),
  z.object({ kind: z.literal("revealed") }),
  z.object({ kind: z.literal("given"), value: z.number().int(), stamped: z.boolean() }),
  z.object({ kind: z.literal("observation"), value: z.number().int() }),
]);
export type Cell = z.infer<typeof cellSchema>;

export const gameSchema = z
  .object({
    recordNo: z.number().int().nonnegative(),
    rows: z.number().int().positive(),
    cols: z.number().int().positive(),
    lies: z.boolean(),
    cameraCount: z.number().int().nonnegative(),
    rating: z.number().int().min(1).max(5),
    status: z.enum(["play", "won", "lost"]),
    strikes: z.number().int().nonnegative(),
    maxStrikes: z.number().int().positive(),
    hints: z.number().int().nonnegative(),
    elapsedSeconds: z.number().int().nonnegative(),
    cells: z.array(cellSchema),
    sightLines: z.array(z.array(z.number().int().nonnegative())),
  })
  .refine(
    (game) =>
      game.cells.length === game.rows * game.cols && game.sightLines.length === game.cells.length,
    { message: "cells and sightLines must have one entry per board cell" },
  );
export type Game = z.infer<typeof gameSchema>;

export const levelStateSchema = z.enum(["locked", "open", "playing", "filed", "seen"]);
export type LevelState = z.infer<typeof levelStateSchema>;

export const levelSchema = z.object({
  level: z.number().int().positive(),
  name: z.string(),
  brief: z.string(),
  state: levelStateSchema,
  game: gameSchema.nullable(),
});
export type Level = z.infer<typeof levelSchema>;

export const dailySchema = z.object({
  day: z.iso.date(),
  dayNumber: z.number().int(),
  outcome: z.enum(["playing", "toppled", "out"]),
  levels: z.array(levelSchema).min(1),
});
export type Daily = z.infer<typeof dailySchema>;
export type RunOutcome = Daily["outcome"];

export const clearResponseSchema = z.object({
  daily: dailySchema,
  outcome: z.enum(["cleared", "cascade", "seen"]),
});
export type ClearResponse = z.infer<typeof clearResponseSchema>;

const verdictSchema = z.enum(["safe", "camera"]);

export const hintSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("wrong_mark"), cell: z.number().int() }),
  z.object({
    kind: z.literal("clue"),
    clueCell: z.number().int(),
    cell: z.number().int(),
    verdict: verdictSchema,
    clueValue: z.number().int(),
    camerasSeen: z.number().int(),
    hiddenSeen: z.number().int(),
  }),
  z.object({ kind: z.literal("deduction"), cell: z.number().int(), verdict: verdictSchema }),
  z.object({ kind: z.literal("none") }),
]);
export type Hint = z.infer<typeof hintSchema>;

export const hintResponseSchema = z.object({ daily: dailySchema, hint: hintSchema });
export type HintResponse = z.infer<typeof hintResponseSchema>;

const levelScoreSchema = z.object({
  level: z.number().int().min(1),
  filed: z.boolean(),
  seconds: z.number().int().nonnegative(),
  hints: z.number().int().nonnegative(),
  strikes: z.number().int().nonnegative(),
  hintPenaltySeconds: z.number().int().nonnegative(),
  strikePenaltySeconds: z.number().int().nonnegative(),
  totalSeconds: z.number().int().nonnegative(),
});

/** A finished day's score and its place among everyone who has finished the same day so far. */
export const standingSchema = z.object({
  day: z.iso.date(),
  dayNumber: z.number().int(),
  levels: z.array(levelScoreSchema).min(1),
  totalSeconds: z.number().int().nonnegative(),
  players: z.number().int().min(1),
  aheadOf: z.number().int().nonnegative(),
  topPercent: z.number().int().min(1).max(100),
  beatPercent: z.number().int().min(0).max(100),
  furtherPercent: z.number().int().min(0).max(100),
  comparable: z.boolean(),
  levelsFiled: z.number().int().nonnegative(),
  scoreSeconds: z.number().int().nonnegative(),
  reached: z.array(z.number().int().nonnegative()).min(2),
  curve: z.object({
    lowSeconds: z.number().int().nonnegative(),
    highSeconds: z.number().int().nonnegative(),
    counts: z.array(z.number().int().nonnegative()).min(1),
  }),
});
export type Standing = z.infer<typeof standingSchema>;

export const errorBodySchema = z.object({ detail: z.string() });
