const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const ASSET_TYPES = new Set(["image", "font", "stylesheet", "script", "media"]);
const ASSET_EXTENSION =
  /\.(?:avif|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|otf|css|m?js|wasm|pbf|mvt|json|duckdb_extension|mp4|webm)(?:\.gz)?$/i;
const FEEDBACK_WIDGET_CONFIG =
  "https://avandar.featurebase.app/api/v1/feedback/widget/config";

/** Reject anything but a lowercase, hyphenated slug for an id-like capture value. */
export function validateId(value, name = "id") {
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

/** Check whether a URL's origin is loopback HTTP(S) or WebSocket. */
export function isLoopbackUrl(value) {
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

/** Require a bare loopback HTTP(S) origin, with no credentials, path, query, or fragment. */
export function validateBaseUrl(value) {
  const url = new URL(value);
  if (
    !isLoopbackUrl(url.href) ||
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

/** Check whether a URL stays on the capture base origin and inside the given workspace. */
export function isWorkspaceRoute(value, baseUrl, workspace) {
  try {
    const url = new URL(value);
    return (
      url.origin === baseUrl &&
      (url.pathname === `/${workspace}` ||
        url.pathname.startsWith(`/${workspace}/`))
    );
  } catch {
    return false;
  }
}

/** Remove userinfo, queries and fragments before any URL reaches an artifact. */
export function sourceUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol))
      return "[non-http source]";
    return `${url.origin}${url.pathname}`;
  } catch {
    return "[invalid source]";
  }
}

/** Browser-network guard, not a sandbox for arbitrary Node.js flow code. */
export function requestPolicy({
  url: value,
  method = "GET",
  resourceType = "fetch",
}) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return { allow: false, reason: "invalid-url" };
  }
  if (url.username || url.password)
    return { allow: false, reason: "url-credentials" };
  if (isLoopbackUrl(value)) return { allow: true, reason: "loopback" };
  if (!new Set(["http:", "https:", "ws:", "wss:"]).has(url.protocol))
    return { allow: false, reason: "non-http-request" };
  if (/(^|\.)supabase\.(?:co|com|in|net)$/.test(url.hostname))
    return { allow: false, reason: "external-supabase" };
  if (["ws:", "wss:"].includes(url.protocol))
    return { allow: false, reason: "external-websocket" };
  // Disable this automatic widget locally. It is never an allowed external write.
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
  if (!["GET", "HEAD"].includes(method.toUpperCase()))
    return { allow: false, reason: "external-mutation" };
  if (resourceType === "document")
    return { allow: false, reason: "external-navigation" };
  // The observed public basemap style is JSON served without a filename suffix.
  if (
    url.hostname === "tiles.openfreemap.org" &&
    ["/styles/bright", "/planet"].includes(url.pathname)
  )
    return { allow: true, reason: "external-readonly-map-style" };
  if (ASSET_TYPES.has(resourceType) || ASSET_EXTENSION.test(url.pathname))
    return { allow: true, reason: "external-readonly-asset" };
  return { allow: false, reason: "external-nonasset-request" };
}
