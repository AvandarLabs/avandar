/** How Pi's `streamProxy` starts the message of a request the proxy refused. */
const PROXY_ERROR_PREFIX = "Proxy error:";

/**
 * What a refused request's message carries after the prefix: the status
 * (`403 Forbidden`, when the body has no error text), or the server's own
 * text from `assertMeetsMinAppRole`.
 */
const ACCESS_DENIED_PATTERNS = [
  /\b403\b/,
  /\bforbidden\b/i,
  /requires at least the '[^']+' role/i,
];

/**
 * True when the agent proxy refused a turn because the user lacks the
 * workspace role it needs (a 403). Pi's `streamProxy` keeps only a message,
 * `Proxy error: <status> <text>` or `Proxy error: <server message>`, so this
 * reads that message.
 */
export function isAgentAccessDenied(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  if (!error.message.startsWith(PROXY_ERROR_PREFIX)) {
    return false;
  }
  const detail = error.message.slice(PROXY_ERROR_PREFIX.length);
  return ACCESS_DENIED_PATTERNS.some((pattern) => {
    return pattern.test(detail);
  });
}
