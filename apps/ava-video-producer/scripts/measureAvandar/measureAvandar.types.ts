import type { ProductBeat } from "../../src/avandar/generated/product";
import type { Page } from "@playwright/test";

/** The review page's scrubbing controls, as `component:review` exposes them. */
type ReviewControls = {
  beats: Record<string, ProductBeat[]>;
  setFeature: (value: string) => void;
  seek: (frame: number) => void;
  frame: () => number;
};

/** The review page globals `component:review` and Remotion expose. */
export type ReviewWindow = typeof window & {
  review: ReviewControls;
  remotion_renderReady?: boolean;
  remotion_delayRenderHandles?: unknown[];
};

/** A rectangle in pixels, with its origin at the top left corner. */
export type Rect = { x: number; y: number; width: number; height: number };

/** The film stage's edges in page coordinates. */
export type StageBounds = {
  x: number;
  y: number;
  right: number;
  bottom: number;
};

/** What the page reports about one element carrying a measured target ID. */
export type TargetCandidate = {
  rect: Rect;
  isHidden: boolean;
  isCanvasProjection: boolean;
  occluder: string | undefined;
};

/** The film stage's bounds and every candidate element for one target. */
export type TargetSnapshot = {
  stage: StageBounds;
  candidates: TargetCandidate[];
};

/** Everything one measurement run collects for its report. */
export type MeasurementRun = {
  page: Page;
  settleMs: number;
  reportDirectory: string;
  errors: Array<{ type: string; message: string }>;
  unresolved: unknown[];
  targets: Record<string, unknown[]>;
  determinism: Array<{ identicalPixels: boolean; identicalText: boolean }>;
  seeks: unknown[];
};
