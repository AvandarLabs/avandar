import { mix } from "../../../motion";
import { StageTheme } from "../../StageTheme/StageTheme";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Rect } from "../../layout/layout";

type GetMarkBuildProgressOptions = {
  frame: number;
  build: MarkBuild | undefined;
  columns?: number;
  buildMotion?: MarkBuildMotion;
};
/** Storyboards are fixed at 30 fps by their schema; `typed()` assumes it. */
const FRAMES_PER_SECOND = 30;
/**
 * Defaults for a lockup's column-mask build when the plan omits them. The
 * stagger between columns is `components.BrandLockup.columnStagger` and each
 * column rises over the theme's whip duration.
 */
const MARK_BUILD_DEFAULTS = { atFrame: 5, columns: 8 } as const;
/** The theme values a mark build reads. */
export type MarkBuildMotion = Readonly<{
  motion: VideoMotion;
  /** Frames between neighbouring columns starting to rise. */
  columnStagger: number;
}>;
/** `classic`'s mark build, the default of the build helpers. */
function _getClassicMarkBuildMotion(): MarkBuildMotion {
  return {
    motion: StageTheme.getClassicStageMotion(),
    columnStagger:
      StageTheme.getClassicStageTheme().components.BrandLockup.columnStagger,
  };
}
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
  /** Frames the columns take to fill the frame. Default the hero duration. */
  durationInFrames?: number;
};
/**
 * How far each column of the mark has risen, 0 to 1, left to right, on the
 * rise curve. With no build every column is already complete, so a lockup
 * can open on a still.
 */
function _getMarkBuildProgress({
  frame,
  build,
  columns = build?.columns ?? MARK_BUILD_DEFAULTS.columns,
  buildMotion = _getClassicMarkBuildMotion(),
}: Readonly<GetMarkBuildProgressOptions>): number[] {
  if (!build) {
    return new Array(columns).fill(1);
  }
  const { motion, columnStagger } = buildMotion;
  const at = build.atFrame ?? MARK_BUILD_DEFAULTS.atFrame;
  const stagger = build.staggerFrames ?? columnStagger;
  const duration = build.durationInFrames ?? motion.whip;
  return Array.from({ length: columns }, (_, index) => {
    return motion.ramp(
      frame,
      at + index * stagger,
      duration,
      motion.rise.easing,
    );
  });
}
/** The frame the last column of a build finishes rising. */
function _getMarkBuildEndFrame({
  build,
  buildMotion = _getClassicMarkBuildMotion(),
}: Readonly<{
  build: MarkBuild | undefined;
  buildMotion?: MarkBuildMotion;
}>): number {
  if (!build) {
    return 0;
  }
  const columns = build.columns ?? MARK_BUILD_DEFAULTS.columns;
  return (
    (build.atFrame ?? MARK_BUILD_DEFAULTS.atFrame) +
    (columns - 1) * (build.staggerFrames ?? buildMotion.columnStagger) +
    (build.durationInFrames ?? buildMotion.motion.whip)
  );
}
/**
 * Where column `index` of `columns` is during a fly-through, from its slice
 * of the mark (progress 0) to its full-height slice of the frame
 * (progress 1), so the columns end covering the whole canvas.
 */
function _getFlightColumnRect(
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
 * the columns flying on the theme's surge, and the columns' fill colour
 * covering the mark.
 */
function _getFlightProgress({
  frame,
  exit,
  motion = StageTheme.getClassicStageMotion(),
}: Readonly<{
  frame: number;
  exit: MarkFlyThrough | undefined;
  motion?: VideoMotion;
}>): { retract: number; flight: number; cover: number } {
  if (!exit) {
    return { retract: 0, flight: 0, cover: 0 };
  }
  const flightAt = exit.atFrame + motion.press.duration;
  const flightFrames = exit.durationInFrames ?? motion.hero;
  return {
    retract: motion.ramp(
      frame,
      exit.atFrame,
      motion.chip,
      motion.travel.easing,
    ),
    flight: motion.ramp(frame, flightAt, flightFrames, motion.surge.easing),
    // The colour lands before the columns stop, so the cut is seamless.
    cover: motion.ramp(
      frame,
      flightAt,
      flightFrames * 0.75,
      motion.dissolve.easing,
    ),
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
/** The frame each CTA line arrives, and the frame the typed command ends. */
type CtaBeats = {
  subtitleAt: number;
  urlAt: number;
  promptAt: number;
  typingAt: number;
  typingEnd: number;
  badgeAt: number;
};
/**
 * When each CTA line arrives: subtitle, URL, the typed command (with the
 * frame its last character lands) and the badge after it. Gaps are the
 * theme's durations, so they follow its tempo.
 */
function _getCtaBeats({
  cta,
  charsPerSecond,
  motion = StageTheme.getClassicStageMotion(),
}: Readonly<{
  cta: LockupCta;
  charsPerSecond: number;
  motion?: VideoMotion;
}>): CtaBeats {
  const subtitleAt = cta.atFrame;
  const urlAt = subtitleAt + motion.word;
  const promptAt = urlAt + motion.hero * 2 - 3;
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
    badgeAt: typingEnd + motion.panel,
  };
}
/**
 * Samples lockup column builds, fly-through exits, and call-to-action beats.
 */
export const BrandLockupMotion = {
  /**
   * How far each column of the mark has risen, 0 to 1, left to right, on the
   * rise curve. With no build every column is already complete, so a lockup
   * can open on a still.
   */
  getMarkBuildProgress: _getMarkBuildProgress,
  /** The frame the last column of a build finishes rising. */
  getMarkBuildEndFrame: _getMarkBuildEndFrame,
  /**
   * Where column `index` of `columns` is during a fly-through, from its slice
   * of the mark (progress 0) to its full-height slice of the frame
   * (progress 1), so the columns end covering the whole canvas.
   */
  getFlightColumnRect: _getFlightColumnRect,
  /**
   * The three phases of a fly-through at one frame: the wordmark retracting,
   * the columns flying on the theme's surge, and the columns' fill colour
   * covering the mark.
   */
  getFlightProgress: _getFlightProgress,
  /**
   * When each CTA line arrives: subtitle, URL, the typed command (with the
   * frame its last character lands) and the badge after it. Gaps are the
   * theme's durations, so they follow its tempo.
   */
  getCtaBeats: _getCtaBeats,
  /**
   * Defaults for a lockup's column-mask build when the plan omits them. The
   * stagger between columns is `components.BrandLockup.columnStagger` and each
   * column rises over the theme's whip duration.
   */
  MARK_BUILD_DEFAULTS,
};
