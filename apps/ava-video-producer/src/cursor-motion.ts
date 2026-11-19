import { ramp } from "./motion";
import {
  getClassicStageMotion,
  getClassicStageTheme,
} from "./scenes/stageTheme/stageTheme";
import type { VideoMotion } from "./videoTheme/createVideoMotion/createVideoMotion";
import type { ResolvedVideoComponents } from "./videoTheme/videoTheme.types";

export type CursorKey = { at: number; x: number; y: number };
export type CursorKind =
  | "default"
  | "pointer"
  | "text"
  | "grab"
  | "grabbing"
  | "zoom-in";
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
export function createCursorMotion(
  motion: VideoMotion,
  cursor: ResolvedVideoComponents["Cursor"],
): CursorMotion {
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
  classicCursorMotion ??= createCursorMotion(
    getClassicStageMotion(),
    getClassicStageTheme().components.Cursor,
  );
  return classicCursorMotion;
}

/**
 * Subpixel travel, clamped at both ends. Equal-position keys create a dwell.
 */
export function trackPos(
  frame: number,
  keys: readonly CursorKey[],
  motion: CursorMotion = _getClassicCursorMotion(),
): { x: number; y: number } {
  if (!keys.length) throw new Error("Cursor paths need at least one key");
  let i = 0;
  while (i < keys.length - 1 && frame >= keys[i + 1].at) i += 1;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const t = a.at === b.at ? 0 : ramp(frame, a.at, b.at - a.at, motion.travel);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Kept for consumers that need a button-down state; Cursor uses press(). */
export function downAt(frame: number, beats: readonly number[]): boolean {
  return beats.some((b) => {
    return frame >= b && frame < b + 6;
  });
}

/** How far the pointer has shrunk for the clicks around this frame. */
export function cursorScale(
  frame: number,
  clicks: readonly number[],
  motion: CursorMotion = _getClassicCursorMotion(),
): number {
  return clicks.reduce((scale, at) => {
    return Math.min(scale, motion.press(frame, at, motion.pressDepth));
  }, 1);
}

/** Switch shape only on arrival, never while crossing unrelated controls. */
export function cursorOnTarget(
  frame: number,
  path: readonly CursorKey[],
  targets: readonly CursorTarget[],
  motion: CursorMotion = _getClassicCursorMotion(),
): CursorKind {
  const p = trackPos(frame, path, motion);
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
const SHUTTER_OFFSETS = [0.45, 0.3, 0.15];
/** Below this travel, in pixels, a sample draws nothing. */
const SHUTTER_MIN_DISTANCE = 0.25;

/**
 * Short shutter samples, capped at the trail limit. No blur on a held click
 * target.
 */
export function cursorShutter(
  frame: number,
  path: readonly CursorKey[],
  motion: CursorMotion = _getClassicCursorMotion(),
): Array<{ x: number; y: number; opacity: number }> {
  const current = trackPos(frame, path, motion);
  return SHUTTER_OFFSETS.map((offset) => {
    const previous = trackPos(frame - offset, path, motion);
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
