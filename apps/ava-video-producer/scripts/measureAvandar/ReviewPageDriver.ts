import { STAGE } from "./measureAvandar.constants";
import type { MeasurementRun, ReviewWindow } from "./measureAvandar.types";
import type { Page } from "@playwright/test";

/** The page's frame, readiness, and every target's bounds at one moment. */
type ReviewSnapshot = {
  frame: number;
  ready: boolean | undefined;
  handles: number;
  targets: Array<{
    target: string | null;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
};

/** The page's current frame, readiness, and every target's bounds. */
async function _readSnapshot(page: Page): Promise<ReviewSnapshot> {
  return page.evaluate(() => {
    const reviewWindow = window as ReviewWindow;
    return {
      frame: reviewWindow.review.frame(),
      ready: reviewWindow.remotion_renderReady,
      handles: reviewWindow.remotion_delayRenderHandles?.length ?? 0,
      targets: [...document.querySelectorAll("[data-video-target]")].map(
        (element) => {
          const { x, y, width, height } = element.getBoundingClientRect();
          return {
            target: element.getAttribute("data-video-target"),
            x,
            y,
            width,
            height,
          };
        },
      ),
    };
  });
}

/**
 * Waits until three consecutive snapshots at `frame` agree, so late widget
 * rerenders cannot move a target after it is measured.
 */
async function _waitForStableTargets(
  page: Page,
  frame: number,
): Promise<ReviewSnapshot> {
  let previousFingerprint: string | undefined;
  let stableSamples = 0;
  let snapshot: ReviewSnapshot | undefined;
  for (let attempt = 0; attempt < 60 && stableSamples < 3; attempt += 1) {
    snapshot = await _readSnapshot(page);
    const fingerprint = JSON.stringify(snapshot);
    stableSamples =
      snapshot.frame === frame &&
      snapshot.ready &&
      snapshot.handles === 0 &&
      fingerprint === previousFingerprint
        ? stableSamples + 1
        : 0;
    previousFingerprint = fingerprint;
    if (stableSamples < 3) {
      await page.waitForTimeout(50);
    }
  }
  if (stableSamples < 3 || !snapshot) {
    throw new Error(
      `Frame ${frame} did not reach stable rendered target bounds.`,
    );
  }
  return snapshot;
}

/**
 * Drives the `component:review` page for the measurement run: opening it,
 * switching feature, and seeking to a frame once it is stable. Used by the
 * cursor target measurement and its determinism check.
 */
export const ReviewPageDriver = {
  /** Opens the review page, optionally switching it to a feature. */
  load: async (
    run: Readonly<MeasurementRun>,
    options: { url: string; feature?: string },
  ): Promise<void> => {
    const { page } = run;
    const { url, feature } = options;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.waitForFunction(() => {
      return Boolean((window as ReviewWindow).review);
    });
    if (feature) {
      await page.evaluate((value) => {
        (window as ReviewWindow).review.setFeature(value);
      }, feature);
    }
    await page.locator(".avandar-film").waitFor({ state: "visible" });
    await page.evaluate(() => {
      return document.fonts.ready;
    });
    const rect = await page.locator(".avandar-film").boundingBox();
    if (!rect || rect.width !== STAGE.width || rect.height !== STAGE.height) {
      throw new Error("Review stage must be exactly 1600 by 840.");
    }
  },

  /** Seeks to a frame, waits until stable, and records the seek in the run. */
  seek: async (run: MeasurementRun, frame: number): Promise<void> => {
    const { page } = run;
    const started = performance.now();
    await page.evaluate((value) => {
      (window as ReviewWindow).review.seek(value);
    }, frame);
    await page.waitForFunction((value) => {
      return (window as ReviewWindow).review.frame() === value;
    }, frame);
    // Player acknowledgement can precede the React commit. Let effects
    // register native rendering handles before testing readiness (notably
    // MapLibre idle).
    await page.evaluate(() => {
      return new Promise((done) => {
        requestAnimationFrame(() => {
          return requestAnimationFrame(done);
        });
      });
    });
    const isReady = (value: number) => {
      const reviewWindow = window as ReviewWindow;
      return (
        reviewWindow.review.frame() === value &&
        reviewWindow.remotion_renderReady === true &&
        (reviewWindow.remotion_delayRenderHandles?.length ?? 0) === 0
      );
    };
    await page.waitForFunction(isReady, frame);
    await page.waitForTimeout(run.settleMs);
    await page.waitForFunction(isReady, frame);
    const snapshot = await _waitForStableTargets(page, frame);
    run.seeks.push({
      frame,
      elapsedMs: Math.round(performance.now() - started),
      ready: snapshot.ready,
      handles: snapshot.handles,
    });
  },
};
