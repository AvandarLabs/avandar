import { FOUND } from "@sbfn/_shared/httpCodes.ts";

type AvaRedirect = {
  type: "redirect";
  response: Response;
};

function _isRedirectResponse(value: unknown): value is Response {
  if (typeof value !== "object" || value === null || !("status" in value)) {
    return false;
  }
  const { status } = value as { status: unknown };
  return typeof status === "number" && status >= 300 && status < 400;
}

/**
 * True when `value` is the object `redirect()` throws, so MiniServer can
 * return its Response as the HTTP redirect.
 *
 * Recognition is by `type: "redirect"` and a 3xx `response.status`, not
 * `instanceof Response`. The edge runtime's Response is not an instance of
 * the constructor this module sees.
 */
export function isRedirect(value: unknown): value is AvaRedirect {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "redirect" &&
    "response" in value &&
    _isRedirectResponse(value.response)
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
