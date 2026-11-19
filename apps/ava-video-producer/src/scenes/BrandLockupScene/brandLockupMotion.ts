import { DUR, EASE, mix, ramp } from "../../motion";
import type { Rect } from "../layout/layout";

/** Storyboards are fixed at 30 fps by their schema; `typed()` assumes it. */
const FRAMES_PER_SECOND = 30;

/** Defaults for a lockup's column-mask build when the plan omits them. */
export const MARK_BUILD_DEFAULTS = {
  atFrame: 5,
  columns: 8,
  /** Frames between neighbouring columns starting to rise. */
  staggerFrames: 1.5,
  durationInFrames: DUR.whip,
} as const;

/** How a lockup's mark is built: N columns rising one after another. */
export type MarkBuild = {
  atFrame?: number;
  columns?: number;
  staggerFrames?: number;
  durationInFrames?: number;
};

/** The lockup's exit: the mark's columns fly through the frame. */
export type MarkFlyThrough = {
  kind: "fly-through";
  atFrame: number;
  /** Frames the columns take to fill the frame. Default `DUR.hero`. */
  durationInFrames?: number;
};

/**
 * How far each column of the mark has risen, 0 to 1, left to right. With no
 * build every column is already complete, so a lockup can open on a still.
 */
export function getMarkBuildProgress(
  frame: number,
  build: MarkBuild | undefined,
  columns = build?.columns ?? MARK_BUILD_DEFAULTS.columns,
): number[] {
  if (!build) {
    return new Array(columns).fill(1);
  }
  const at = build.atFrame ?? MARK_BUILD_DEFAULTS.atFrame;
  const stagger = build.staggerFrames ?? MARK_BUILD_DEFAULTS.staggerFrames;
  const duration =
    build.durationInFrames ?? MARK_BUILD_DEFAULTS.durationInFrames;
  return Array.from({ length: columns }, (_, index) => {
    return ramp(frame, at + index * stagger, duration, EASE.word);
  });
}

/** The frame the last column of a build finishes rising. */
export function getMarkBuildEndFrame(build: MarkBuild | undefined): number {
  if (!build) {
    return 0;
  }
  const columns = build.columns ?? MARK_BUILD_DEFAULTS.columns;
  return (
    (build.atFrame ?? MARK_BUILD_DEFAULTS.atFrame) +
    (columns - 1) * (build.staggerFrames ?? MARK_BUILD_DEFAULTS.staggerFrames) +
    (build.durationInFrames ?? MARK_BUILD_DEFAULTS.durationInFrames)
  );
}

/**
 * Where column `index` of `columns` is during a fly-through, from its slice
 * of the mark (progress 0) to its full-height slice of the frame
 * (progress 1), so the columns end covering the whole canvas.
 */
export function getFlightColumnRect(
  index: number,
  columns: number,
  mark: Rect,
  canvas: { width: number; height: number },
  progress: number,
): Rect {
  const from = {
    x: mark.x + (index * mark.width) / columns,
    y: mark.y,
    width: mark.width / columns,
    height: mark.height,
  };
  const to = {
    x: (index * canvas.width) / columns,
    y: 0,
    width: canvas.width / columns,
    height: canvas.height,
  };
  return {
    x: mix(progress, from.x, to.x),
    y: mix(progress, from.y, to.y),
    width: mix(progress, from.width, to.width),
    height: mix(progress, from.height, to.height),
  };
}

/**
 * The three phases of a fly-through at one frame: the wordmark retracting,
 * the columns flying, and the columns' fill colour covering the mark.
 */
export function getFlightProgress(
  frame: number,
  exit: MarkFlyThrough | undefined,
): { retract: number; flight: number; cover: number } {
  if (!exit) {
    return { retract: 0, flight: 0, cover: 0 };
  }
  const flightAt = exit.atFrame + DUR.press;
  const flightFrames = exit.durationInFrames ?? DUR.hero;
  return {
    retract: ramp(frame, exit.atFrame, DUR.chip, EASE.inOut),
    flight: ramp(frame, flightAt, flightFrames, EASE.surge),
    // The colour lands before the columns stop, so the cut is seamless.
    cover: ramp(frame, flightAt, flightFrames * 0.75, EASE.inOut),
  };
}

/** A lockup's call to action: lines that cascade in below the mark. */
export type LockupCta = {
  atFrame: number;
  subtitle?: string;
  url?: string;
  command?: string;
  badge?: string;
  commandCharsPerSecond?: number;
};

/**
 * When each CTA line arrives: subtitle, URL, the typed command (with the
 * frame its last character lands) and the badge after it.
 */
export function getCtaBeats(cta: LockupCta, charsPerSecond: number) {
  const subtitleAt = cta.atFrame;
  const urlAt = subtitleAt + DUR.word;
  const promptAt = urlAt + DUR.hero * 2 - 3;
  const typingAt = promptAt + 3;
  const typingFrames = Math.ceil(
    ((cta.command?.length ?? 0) / charsPerSecond) * FRAMES_PER_SECOND,
  );
  const typingEnd = typingAt + typingFrames;
  return {
    subtitleAt,
    urlAt,
    promptAt,
    typingAt,
    typingEnd,
    badgeAt: typingEnd + DUR.panel,
  };
}
