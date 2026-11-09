import { EtlTransientStoreError } from "@etl/stores/EtlTransientStoreError";

/** The fields of a Supabase error the message is built from. */
export type SupabaseErrorLike = Readonly<{
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}>;

/**
 * HTTP statuses a later attempt can succeed at. Status 0 is no response at
 * all, which is how `supabase-js` reports a network error. Every 5xx is
 * here too (see `_isTransientStatus`), including Cloudflare's 520-524.
 */
const TRANSIENT_STATUSES: ReadonlySet<number> = new Set([0, 408, 429]);

/**
 * Postgres and PostgREST error codes a later attempt can succeed at: a
 * statement or lock timeout, a serialization failure or deadlock, too many
 * connections, a server shutting down or starting up, and PostgREST losing
 * its database connection or schema cache. Connection errors (`08xxx`) are
 * matched by their class.
 */
const TRANSIENT_CODES: ReadonlySet<string> = new Set([
  "57014",
  "55P03",
  "40001",
  "40P01",
  "53300",
  "57P01",
  "57P02",
  "57P03",
  "PGRST000",
  "PGRST001",
  "PGRST002",
]);

const CONNECTION_ERROR_CLASS = "08";

const HTML_TITLE_PATTERN = /<title>([^<]*)<\/title>/i;

function _isTransientStatus(status: number | undefined): boolean {
  return (
    status !== undefined && (TRANSIENT_STATUSES.has(status) || status >= 500)
  );
}

function _isTransientCode(code: string | undefined): boolean {
  return (
    code !== undefined &&
    (TRANSIENT_CODES.has(code) || code.startsWith(CONNECTION_ERROR_CLASS))
  );
}

/**
 * Supabase's message, or, when a gateway answered with an HTML error page,
 * just that page's title and the status, so a report does not carry a
 * whole web page.
 */
function _summarizeMessage(
  message: string,
  status: number | undefined,
): string {
  const title = HTML_TITLE_PATTERN.exec(message)?.[1]?.trim();
  if (title === undefined) {
    return message;
  }
  return status === undefined ? title : `HTTP ${String(status)}: ${title}`;
}

/**
 * Throws when a Supabase request failed, naming what was being done and
 * Supabase's message, code, details, and hint. The original error is kept as
 * the cause. A failure a later attempt can succeed at (see
 * `TRANSIENT_STATUSES` and `TRANSIENT_CODES`) throws an
 * `EtlTransientStoreError`, which the engine retries. Any other failure
 * throws a plain `Error`.
 *
 * @param args.error - The `error` a Supabase request resolved with.
 * @param args.status - The `status` it resolved with, when known.
 * @param args.action - What was being done, such as `reading rows from x`.
 * @throws When `error` is not null.
 */
export function throwOnSupabaseError(args: {
  error: SupabaseErrorLike | null;
  status?: number;
  action: string;
}): void {
  const { error, status } = args;
  if (!error) {
    return;
  }
  const extras = [
    error.code ? `code ${error.code}` : "",
    error.details ? `details: ${error.details}` : "",
    error.hint ? `hint: ${error.hint}` : "",
  ].filter((extra) => {
    return extra !== "";
  });
  const suffix = extras.length === 0 ? "" : ` (${extras.join("; ")})`;
  const message = `Supabase failed ${args.action}: ${_summarizeMessage(error.message, status)}${suffix}`;
  const code = error.code === "" ? undefined : error.code;
  if (_isTransientStatus(status) || _isTransientCode(code)) {
    throw new EtlTransientStoreError(message, { status, code, cause: error });
  }
  throw new Error(message, { cause: error });
}
