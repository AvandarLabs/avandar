import { isDenoRuntime } from "./isDenoRuntime.ts";
import { isNodeRuntime } from "./isNodeRuntime.ts";
import { isViteBrowserRuntime } from "./isViteBrowserRuntime.ts";

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
  if (isDenoRuntime()) {
    if (Deno.env.get("MODE") === "development") {
      console.log(
        "getting the override email",
        Deno.env.get("DEV_EMAIL_OVERRIDE"),
      );
      return Deno.env.get("DEV_EMAIL_OVERRIDE") || fallback;
    }
    return undefined;
  }

  if (isNodeRuntime()) {
    if (process.env.NODE_ENV === "development") {
      return process.env.DEV_EMAIL_OVERRIDE || fallback;
    }
    return undefined;
  }

  if (isViteBrowserRuntime()) {
    // not possible. This is striclty a backend environment variable.
    return undefined;
  }

  return undefined;
}
