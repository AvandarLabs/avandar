/** The fields of a Supabase error the message is built from. */
export type SupabaseErrorLike = Readonly<{
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}>;

/**
 * Throws when a Supabase request failed, naming what was being done and
 * Supabase's message, code, details, and hint. The original error is kept as
 * the cause.
 *
 * @param args.error - The `error` a Supabase request resolved with.
 * @param args.action - What was being done, such as `reading rows from x`.
 * @throws When `error` is not null.
 */
export function throwOnSupabaseError(args: {
  error: SupabaseErrorLike | null;
  action: string;
}): void {
  const { error } = args;
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
  throw new Error(`Supabase failed ${args.action}: ${error.message}${suffix}`, {
    cause: error,
  });
}
