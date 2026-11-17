import type { z } from "zod";

const PREFIX = "surveilled.";

/**
 * Reads a per-viewer convenience value from localStorage, validated by `schema`. Storage can be
 * blocked (private windows, cleared site data), so failures warn and return `fallback`. Never
 * use this for state that must persist.
 */
export function readStored<T>(key: string, schema: z.ZodType<T>, fallback: T): T {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(PREFIX + key);
  } catch (error) {
    console.warn(`localStorage unavailable; using the default for "${key}".`, error);
    return fallback;
  }
  if (raw === null) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.warn(`Stored "${key}" is not JSON; using the default.`, error);
    return fallback;
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    console.warn(`Stored "${key}" has an unexpected shape; using the default.`, result.error);
    return fallback;
  }
  return result.data;
}

/** Writes a per-viewer convenience value. A blocked storage only warns. */
export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.warn(`localStorage unavailable; "${key}" was not saved.`, error);
  }
}

/** Removes a stored value. A blocked storage only warns. */
export function removeStored(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch (error) {
    console.warn(`localStorage unavailable; "${key}" was not removed.`, error);
  }
}
