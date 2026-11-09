import type { PipelineSupabaseTarget } from "@pipelines/shared/PipelineRunOptions.types";

/** The header a caller sends the Supabase project's API URL in. */
export const SUPABASE_URL_HEADER = "x-ava-supabase-url";

/** The header a caller sends the project's service role key in. */
export const SUPABASE_KEY_HEADER = "x-ava-supabase-service-role-key";

/** The `name` of the error a missing or invalid target throws. */
export const SUPABASE_TARGET_ERROR_NAME = "SupabaseTargetError";

/** Hosts a local Supabase stack answers on, which may be plain http. */
const _LOCAL_HOSTS: ReadonlySet<string> = new Set([
  "127.0.0.1",
  "localhost",
  "[::1]",
  "host.docker.internal",
]);

function _fail(message: string): never {
  const error = new Error(message);
  error.name = SUPABASE_TARGET_ERROR_NAME;
  throw error;
}

function _readUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    _fail(`Send the Supabase project's API URL in ${SUPABASE_URL_HEADER}.`);
  }
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    _fail(`${SUPABASE_URL_HEADER} is not a URL.`);
  }
  if (url.protocol !== "https:" && !_LOCAL_HOSTS.has(url.hostname)) {
    _fail(`${SUPABASE_URL_HEADER} must use https unless it is a local stack.`);
  }
  if (url.pathname !== "/" || url.search !== "" || url.hash !== "") {
    _fail(`${SUPABASE_URL_HEADER} must be the project's origin, with no path.`);
  }
  return url.origin;
}

/**
 * Reads the Supabase project a request asks the server to load into, from
 * its `X-Ava-Supabase-Url` and `X-Ava-Supabase-Service-Role-Key` headers.
 * They are headers, not body fields, because a run records its body, and
 * the key must never be stored. No error repeats the key.
 *
 * @param headers - The request's headers.
 * @returns The target.
 * @throws An error named `SUPABASE_TARGET_ERROR_NAME` when either header is
 *   missing, or the URL is not a project origin over https (http is allowed
 *   for a local stack).
 */
export function readSupabaseTarget(
  headers: Readonly<Record<string, unknown>>,
): PipelineSupabaseTarget {
  const url = _readUrl(headers[SUPABASE_URL_HEADER]);
  const rawKey = headers[SUPABASE_KEY_HEADER];
  if (typeof rawKey !== "string" || rawKey.trim() === "") {
    _fail(`Send the project's service role key in ${SUPABASE_KEY_HEADER}.`);
  }
  return { url, serviceRoleKey: rawKey.trim() };
}
