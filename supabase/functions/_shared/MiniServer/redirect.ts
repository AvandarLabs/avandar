import { FOUND } from "../httpCodes.ts";

type AvaRedirect = {
  type: "redirect";
  response: Response;
};

export function isRedirect(value: unknown): value is AvaRedirect {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "redirect" &&
    "response" in value &&
    value.response instanceof Response
  );
}

/**
 * Redirects the response to the specified URL.
 *
 * This function is expect to be thrown in order to be caught by our
 * server.
 *
 * Usage:
 * ```ts
 * throw redirect(url)
 * ```
 *
 * @param url The URL to redirect to.
 * @returns An object that can be processed by our server to
 * perform the redirect.
 */
export function redirect(url: string): AvaRedirect {
  return { type: "redirect", response: Response.redirect(url, FOUND) };
}
