import type { z } from "zod";
import { errorBodySchema } from "./schemas.ts";

/** A non-2xx API response. `message` is the server's player-safe `detail` when it sent one. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Calls a relative `/api/...` path (proxied to FastAPI in dev) and parses the JSON body with
 * `schema`. Throws ApiError for HTTP failures and a ZodError when a success body breaks the contract.
 */
export async function requestJson<T>(
  path: string,
  schema: z.ZodType<T>,
  init?: { method: "GET" | "POST" | "DELETE"; body?: unknown },
): Promise<T> {
  const response = await fetch(path, {
    method: init?.method ?? "GET",
    headers: init?.body === undefined ? undefined : { "Content-Type": "application/json" },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const isJson = response.headers.get("content-type")?.includes("application/json") ?? false;

  if (!response.ok) {
    const detail = isJson ? errorBodySchema.safeParse(await response.json()) : null;
    throw new ApiError(
      response.status,
      detail?.success ? detail.data.detail : `Request failed with status ${response.status}.`,
    );
  }
  if (!isJson) {
    throw new ApiError(response.status, "The server answered without a JSON body.");
  }
  return schema.parse(await response.json());
}
