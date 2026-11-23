import { CaptureUrlSafety } from "./CaptureUrlSafety/CaptureUrlSafety";
import type { BrowserContext } from "@playwright/test";
/** A request the capture network guard blocked or suppressed. */
export type NetworkGuardEvent = {
  sourceUrl: string;
  method: string;
  reason: string;
};
type NetworkGuardListener = (event: NetworkGuardEvent) => Promise<void>;
async function _guardRequests({
  context,
  onBlocked,
  onSuppressed,
}: Readonly<{
  context: BrowserContext;
  onBlocked: NetworkGuardListener;
  onSuppressed: NetworkGuardListener;
}>): Promise<void> {
  await context.route("**/*", async (route) => {
    const request = route.request();
    const decision = CaptureUrlSafety.getRequestDecisionFromRequest({
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
    });
    if (decision.allow) {
      return route.continue();
    }
    const event = {
      sourceUrl: CaptureUrlSafety.makeSourceUrlFromUrl(request.url()),
      method: request.method(),
      reason: decision.reason,
    };
    if (decision.suppress) {
      try {
        await onSuppressed(event);
      } finally {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "{}",
          headers: { "access-control-allow-origin": "*" },
        });
      }
      return undefined;
    }
    try {
      await onBlocked(event);
    } finally {
      await route.abort("blockedbyclient");
    }
    return undefined;
  });
}
async function _guardWebSockets({
  context,
  onBlocked,
}: Readonly<{
  context: BrowserContext;
  onBlocked: NetworkGuardListener;
}>): Promise<void> {
  if (typeof context.routeWebSocket !== "function") {
    throw new Error("Capture requires Playwright WebSocket routing support");
  }
  await context.routeWebSocket("**/*", async (route) => {
    const decision = CaptureUrlSafety.getRequestDecisionFromRequest({
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
        sourceUrl: CaptureUrlSafety.makeSourceUrlFromUrl(route.url()),
        method: "WEBSOCKET",
        reason: decision.reason,
      });
    } finally {
      await route.close({ code: 1008, reason: "Local capture network policy" });
    }
  });
}
/**
 * Routes every request and WebSocket of a Playwright context through the
 * capture network policy, reporting each denial to the given listeners.
 * Capture runs install it on every browser context they open.
 */
export async function installNetworkGuard({
  context,
  onBlocked,
  onSuppressed = async () => {},
}: Readonly<{
  context: BrowserContext;
  onBlocked: NetworkGuardListener;
  onSuppressed?: NetworkGuardListener;
}>): Promise<void> {
  await _guardRequests({ context, onBlocked, onSuppressed });
  await _guardWebSockets({
    context,
    onBlocked,
  });
}
