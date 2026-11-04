import type { BrowserContext } from "@playwright/test";

/** The Featurebase SDK script `index.html` injects on every page load. */
const FEATUREBASE_URL_PATTERN = "https://do.featurebase.app/**";

/**
 * Answers every Featurebase request with an empty script, so no spec depends
 * on a third-party host.
 *
 * The SDK is a script element, and a script still loading holds back the
 * page's `load` event. When the host stalled, every `page.goto` waiting on
 * `load` hung until the test timed out. `index.html` defines a queueing
 * `window.Featurebase` before the SDK arrives, so with an empty script the app
 * behaves as it does while the real SDK is still downloading. No spec
 * exercises the feedback widget itself.
 */
export async function stubFeaturebaseSdk(
  context: BrowserContext,
): Promise<void> {
  await context.route(FEATUREBASE_URL_PATTERN, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    });
  });
}
