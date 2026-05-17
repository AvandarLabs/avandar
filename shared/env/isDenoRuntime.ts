/**
 * Checks if the current environment is Deno. This function can be called from
 * many different environments.
 *
 * @returns True if the current environment is Deno, false otherwise.
 */
export function isDenoRuntime(): boolean {
  const g = globalThis as { Deno?: unknown };
  return typeof g.Deno !== "undefined";
}
