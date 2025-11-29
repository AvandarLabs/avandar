/**
 * Returns the override email address to use in development.
 *
 * If the `DEV_EMAIL_OVERRIDE` environment variable is set, it will return that
 * value. Otherwise, it will return the default Resend test email address
 * (unless a different fallback is provided).
 *
 * This function only returns a value in development environments. In any other
 * environment, it will return `undefined`.
 */
export function getDevOverrideEmail(
  fallback: string = "delivered@resend.dev",
): string | undefined {
  // node
  if (process.env) {
    if (process.env.NODE_ENV === "development") {
      return process.env.DEV_EMAIL_OVERRIDE || fallback;
    }
    return undefined;
  }

  // browser
  if (import.meta.env) {
    // not possible. We should never return a value in browsers. This is
    // strictly a backend environment variable.
    return undefined;
  }

  // deno
  if (Deno) {
    if (Deno.env.get("MODE") === "development") {
      return Deno.env.get("DEV_EMAIL_OVERRIDE") || fallback;
    }
    return undefined;
  }

  return undefined;
}
