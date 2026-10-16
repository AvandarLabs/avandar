import { rename, writeFile } from "node:fs/promises";
import { basename, relative, sep } from "node:path";
import { assertSafeManifest } from "./sanitize.mjs";
import { requestPolicy, sourceUrl } from "./urlSafety.mjs";
import { isWithin } from "./fsSafety.mjs";

/** Validate a manifest for leaked credentials, then write it atomically with owner-only mode. */
export async function writeManifest(path, manifest, secrets = []) {
  assertSafeManifest(manifest, secrets);
  const temporary = `${path}.tmp`;
  await writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporary, path);
}

/** Route every request and WebSocket through the capture network policy, reporting denials. */
export async function installNetworkGuard(
  context,
  onBlocked,
  onSuppressed = async (_event) => {},
) {
  await context.route("**/*", async (route) => {
    const request = route.request();
    const decision = requestPolicy({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
    });
    if (decision.allow) return route.continue();
    if (decision.suppress) {
      try {
        await onSuppressed({
          sourceUrl: sourceUrl(request.url()),
          method: request.method(),
          reason: decision.reason,
        });
      } finally {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "{}",
          headers: { "access-control-allow-origin": "*" },
        });
      }
      return;
    }
    try {
      await onBlocked({
        sourceUrl: sourceUrl(request.url()),
        method: request.method(),
        reason: decision.reason,
      });
    } finally {
      await route.abort("blockedbyclient");
    }
  });
  if (typeof context.routeWebSocket !== "function")
    throw new Error("Capture requires Playwright WebSocket routing support");
  await context.routeWebSocket("**/*", async (route) => {
    const decision = requestPolicy({
      url: route.url(),
      method: "GET",
      resourceType: "websocket",
    });
    if (decision.allow) {
      route.connectToServer();
      return;
    }
    try {
      await onBlocked({
        sourceUrl: sourceUrl(route.url()),
        method: "WEBSOCKET",
        reason: decision.reason,
      });
    } finally {
      await route.close({ code: 1008, reason: "Local capture network policy" });
    }
  });
}

/** Express an artifact path relative to the capture root, rejecting one that escapes it. */
export function relativeArtifact(root, path) {
  if (!isWithin(root, path))
    throw new Error("Artifact escapes capture directory");
  return relative(root, path).split(sep).join("/");
}

/** Derive a capture run's id from its run directory name. */
export function captureRunId(path) {
  return basename(path);
}
