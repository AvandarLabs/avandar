import { Motion } from "./motion";
import { StageTheme } from "./scenes/StageTheme/StageTheme";
import type { VideoMotion } from "./videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { ResolvedVideoComponents } from "./videoTheme/videoTheme.types";

type CursorOnTargetOptions = {
  frame: number;
  path: readonly CursorKey[];
  targets: readonly CursorTarget[];
  motion?: CursorMotion;
};
/** A frame and position key for scripted pointer motion. */
export type CursorKey = {
  at: number;
  x: number;
  y: number;
};
/** Cursor artwork available to scripted pointer targets. */
export type CursorKind =
  | "default"
  | "pointer"
  | "text"
  | "grab"
  | "grabbing"
  | "zoom-in";
/** A frame, position, and cursor shape for a pointer target. */
export type CursorTarget = {
  frame: number;
  x: number;
  y: number;
  cursor: CursorKind;
};
/**
 * The theme values the pointer helpers read: the travel curve between keys,
 * the press dip, and the motion trail. Build it with `createCursorMotion`.
 */
export type CursorMotion = Readonly<{
  travel: (progress: number) => number;
  press: VideoMotion["press"];
  pressDepth: number;
  trailAlpha: number;
  trailLimit: number;
}>;
/**
 * The pointer's motion from a theme: it travels on
 * `components.Cursor.travelEasing`, dips by
 * `components.Cursor.pressDepth` over the press duration, and trails by
 * `components.Cursor.trailAlpha` up to `trailLimit` pixels.
 */
function _makeCursorMotionFromVideoMotionAndCursor({
  motion,
  cursor,
}: Readonly<{
  motion: VideoMotion;
  cursor: ResolvedVideoComponents["Cursor"];
}>): CursorMotion {
  return {
    travel: motion.curve(cursor.travelEasing),
    press: motion.press,
    pressDepth: cursor.pressDepth,
    trailAlpha: cursor.trailAlpha,
    trailLimit: cursor.trailLimit,
  };
}
let classicCursorMotion: CursorMotion | undefined;
/** `classic`'s pointer motion, the default of every pointer helper. */
function _getClassicCursorMotion(): CursorMotion {
  classicCursorMotion ??= _makeCursorMotionFromVideoMotionAndCursor({
    motion: StageTheme.getClassicStageMotion(),
    cursor: StageTheme.getClassicStageTheme().components.Cursor,
  });
  return classicCursorMotion;
}
/**
 * Subpixel travel, clamped at both ends. Equal-position keys create a dwell.
 */
function _trackPos({
  frame,
  keys,
  motion = _getClassicCursorMotion(),
}: Readonly<{
  frame: number;
  keys: readonly CursorKey[];
  motion?: CursorMotion;
}>): {
  x: number;
  y: number;
} {
  if (!keys.length) {
    throw new Error("Cursor paths need at least one key");
  }
  const firstLaterIndex = keys.findIndex((key, index) => {
    return index > 0 && !(frame >= key.at);
  });
  const i = firstLaterIndex < 0 ? keys.length - 1 : firstLaterIndex - 1;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const t =
    a.at === b.at
      ? 0
      : Motion.ramp({
          frame,
          at: a.at,
          dur: b.at - a.at,
          easing: motion.travel,
        });
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
/** Kept for consumers that need a button-down state; Cursor uses press(). */
function _downAt({
  frame,
  beats,
}: Readonly<{
  frame: number;
  beats: readonly number[];
}>): boolean {
  return beats.some((b) => {
    return frame >= b && frame < b + 6;
  });
}
/** How far the pointer has shrunk for the clicks around this frame. */
function _cursorScale({
  frame,
  clicks,
  motion = _getClassicCursorMotion(),
}: Readonly<{
  frame: number;
  clicks: readonly number[];
  motion?: CursorMotion;
}>): number {
  return clicks.reduce((scale, at) => {
    return Math.min(scale, motion.press(frame, at, motion.pressDepth));
  }, 1);
}
/** Switch shape only on arrival, never while crossing unrelated controls. */
function _cursorOnTarget({
  frame,
  path,
  targets,
  motion = _getClassicCursorMotion(),
}: Readonly<CursorOnTargetOptions>): CursorKind {
  const p = _trackPos({ frame, keys: path, motion });
  return (
    targets.find((target) => {
      return (
        frame <= target.frame + 8 &&
        Math.hypot(p.x - target.x, p.y - target.y) < 0.01
      );
    })?.cursor ??
    [...targets].reverse().find((target) => {
      return (
        frame > target.frame &&
        Math.hypot(p.x - target.x, p.y - target.y) < 0.01
      );
    })?.cursor ??
    "default"
  );
}
/** When the trail samples sit, in frames before the current one. */
const SHUTTER_OFFSETS = [0.45, 0.3, 0.15] as const;
/** Below this travel, in pixels, a sample draws nothing. */
const SHUTTER_MIN_DISTANCE = 0.25;
/**
 * Short shutter samples, capped at the trail limit. No blur on a held click
 * target.
 */
function _cursorShutter({
  frame,
  path,
  motion = _getClassicCursorMotion(),
}: Readonly<{
  frame: number;
  path: readonly CursorKey[];
  motion?: CursorMotion;
}>): Array<{
  x: number;
  y: number;
  opacity: number;
}> {
  const current = _trackPos({ frame, keys: path, motion });
  return SHUTTER_OFFSETS.map((offset) => {
    const previous = _trackPos({ frame: frame - offset, keys: path, motion });
    const dx = previous.x - current.x,
      dy = previous.y - current.y;
    const distance = Math.hypot(dx, dy);
    const limit =
      distance > motion.trailLimit ? motion.trailLimit / distance : 1;
    return {
      x: dx * limit,
      y: dy * limit,
      opacity: distance < SHUTTER_MIN_DISTANCE ? 0 : motion.trailAlpha,
    };
  });
}
/** Samples themed pointer travel, click states, cursor shapes, and trails. */
export const CursorMotionHelpers = {
  /**
   * The pointer's motion from a theme: it travels on
   * `components.Cursor.travelEasing`, dips by
   * `components.Cursor.pressDepth` over the press duration, and trails by
   * `components.Cursor.trailAlpha` up to `trailLimit` pixels.
   */
  makeCursorMotionFromVideoMotionAndCursor:
    _makeCursorMotionFromVideoMotionAndCursor,
  /**
   * Subpixel travel, clamped at both ends. Equal-position keys create a dwell.
   */
  trackPos: _trackPos,
  /** Kept for consumers that need a button-down state; Cursor uses press(). */
  downAt: _downAt,
  /** How far the pointer has shrunk for the clicks around this frame. */
  cursorScale: _cursorScale,
  /** Switch shape only on arrival, never while crossing unrelated controls. */
  cursorOnTarget: _cursorOnTarget,
  /**
   * Short shutter samples, capped at the trail limit. No blur on a held click
   * target.
   */
  cursorShutter: _cursorShutter,
};
