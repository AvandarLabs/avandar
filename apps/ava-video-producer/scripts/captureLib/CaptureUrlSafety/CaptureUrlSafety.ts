const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const ASSET_TYPES = new Set(["image", "font", "stylesheet", "script", "media"]);
const ASSET_EXTENSION =
  /\.(?:avif|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|css|m?js|wasm|pbf|mvt|json|duckdb_extension|mp4|webm)(?:\.gz)?$/i;
const FEEDBACK_WIDGET_CONFIG =
  "https://avandar.featurebase.app/api/v1/feedback/widget/config";
/**
 * Whether the capture network guard lets a browser request through, and why.
 */
export type RequestDecision = {
  allow: boolean;
  reason: string;
  suppress?: boolean;
};
/**
 * Rejects anything but a lowercase, hyphenated slug for an id-like capture
 * value.
 */
function _validateId({
  value,
  name = "id",
}: Readonly<{
  value: unknown;
  name?: string;
}>): string {
  if (
    typeof value !== "string" ||
    !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(value) ||
    value.length > 80
  ) {
    throw new Error(
      `${name} must be a lowercase slug of at most 80 characters`,
    );
  }
  return value;
}
/** Whether a URL's origin is loopback HTTP(S) or WebSocket. */
function _isLoopbackUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ["http:", "https:", "ws:", "wss:"].includes(url.protocol) &&
      LOOPBACK_HOSTS.has(url.hostname)
    );
  } catch {
    return false;
  }
}
/**
 * Requires a bare loopback HTTP(S) origin, with no credentials, path, query,
 * or fragment.
 */
function _validateBaseUrl(value: string): string {
  const url = new URL(value);
  if (
    !_isLoopbackUrl(url.href) ||
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(
      "baseUrl must be a loopback HTTP(S) origin without credentials, path, query, or fragment",
    );
  }
  return url.origin;
}
/**
 * Whether a URL stays on the capture base origin and inside the given
 * workspace.
 */
function _isWorkspaceRoute({
  url,
  baseUrl,
  workspace,
}: Readonly<{
  url: string;
  baseUrl: string;
  workspace: string;
}>): boolean {
  try {
    const parsedUrl = new URL(url);
    return (
      parsedUrl.origin === baseUrl &&
      (parsedUrl.pathname === `/${workspace}` ||
        parsedUrl.pathname.startsWith(`/${workspace}/`))
    );
  } catch {
    return false;
  }
}
/**
 * Removes userinfo, queries and fragments before any URL reaches an
 * artifact.
 */
function _makeSourceUrlFromUrl(value: string): string {
  try {
    const url = new URL(value);
    return ["http:", "https:", "ws:", "wss:"].includes(url.protocol)
      ? `${url.origin}${url.pathname}`
      : "[non-http source]";
  } catch {
    return "[invalid source]";
  }
}
function _parseUrl(value: string): URL | undefined {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
}
/** The decision for an external request that passed the transport checks. */
function _decideExternalRequest({
  url,
  method,
  resourceType,
}: Readonly<{
  url: URL;
  method: string;
  resourceType: string;
}>): RequestDecision {
  // Disable this automatic widget locally. It is never an allowed external
  // write.
  if (
    url.href === FEEDBACK_WIDGET_CONFIG &&
    method.toUpperCase() === "POST" &&
    ["fetch", "xhr"].includes(resourceType)
  ) {
    return {
      allow: false,
      suppress: true,
      reason: "nonessential-feedback-widget",
    };
  }
  if (!["GET", "HEAD"].includes(method.toUpperCase())) {
    return { allow: false, reason: "external-mutation" };
  }
  if (resourceType === "document") {
    return { allow: false, reason: "external-navigation" };
  }
  // The observed public basemap style is JSON served without a filename
  // suffix.
  if (
    url.hostname === "tiles.openfreemap.org" &&
    ["/styles/bright", "/planet"].includes(url.pathname)
  ) {
    return { allow: true, reason: "external-readonly-map-style" };
  }
  return ASSET_TYPES.has(resourceType) || ASSET_EXTENSION.test(url.pathname)
    ? { allow: true, reason: "external-readonly-asset" }
    : { allow: false, reason: "external-nonasset-request" };
}
/**
 * Decides whether a capture browser request may proceed: loopback traffic and
 * read-only external assets pass, everything else is refused with a reason.
 * A browser-network guard, not a sandbox for arbitrary Node.js flow code.
 */
function _getRequestDecisionFromRequest({
  url: value,
  method = "GET",
  resourceType = "fetch",
}: Readonly<{
  url: string;
  method?: string;
  resourceType?: string;
}>): RequestDecision {
  const url = _parseUrl(value);
  if (!url) {
    return { allow: false, reason: "invalid-url" };
  }
  if (url.username || url.password) {
    return { allow: false, reason: "url-credentials" };
  }
  if (_isLoopbackUrl(value)) {
    return { allow: true, reason: "loopback" };
  }
  if (!new Set(["http:", "https:", "ws:", "wss:"]).has(url.protocol)) {
    return { allow: false, reason: "non-http-request" };
  }
  if (/(^|\.)supabase\.(?:co|com|in|net)$/.test(url.hostname)) {
    return { allow: false, reason: "external-supabase" };
  }
  if (["ws:", "wss:"].includes(url.protocol)) {
    return { allow: false, reason: "external-websocket" };
  }
  return _decideExternalRequest({ url, method, resourceType });
}

/**
 * Checks capture origins and browser requests against the local recording
 * policy.
 */
export const CaptureUrlSafety = {
  /**
   * Rejects anything but a lowercase, hyphenated slug for an id-like capture
   * value.
   */
  validateId: _validateId,
  /** Whether a URL's origin is loopback HTTP(S) or WebSocket. */
  isLoopbackUrl: _isLoopbackUrl,
  /**
   * Requires a bare loopback HTTP(S) origin, with no credentials, path, query,
   * or fragment.
   */
  validateBaseUrl: _validateBaseUrl,
  /**
   * Whether a URL stays on the capture base origin and inside the given
   * workspace.
   */
  isWorkspaceRoute: _isWorkspaceRoute,
  /**
   * Removes userinfo, queries and fragments before any URL reaches an artifact.
   */
  makeSourceUrlFromUrl: _makeSourceUrlFromUrl,
  /**
   * Decides whether a capture browser request may proceed: loopback traffic and
   * read-only external assets pass, everything else is refused with a reason.
   */
  getRequestDecisionFromRequest: _getRequestDecisionFromRequest,
};
