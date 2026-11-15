import { EASE, press, ramp } from "./motion";

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

/** Subpixel travel, clamped at both ends. Equal-position keys create a dwell. */
export function trackPos(frame: number, keys: readonly CursorKey[]) {
  if (!keys.length) throw new Error("Cursor paths need at least one key");
  let i = 0;
  while (i < keys.length - 1 && frame >= keys[i + 1].at) i += 1;
  const a = keys[i];
  const b = keys[Math.min(i + 1, keys.length - 1)];
  const t = a.at === b.at ? 0 : ramp(frame, a.at, b.at - a.at, EASE.inOutCubic);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Kept for consumers that need a button-down state; Cursor uses press(). */
export function downAt(frame: number, beats: readonly number[]) {
  return beats.some((b) => frame >= b && frame < b + 6);
}

export function cursorScale(frame: number, clicks: readonly number[]) {
  return clicks.reduce(
    (scale, at) => Math.min(scale, press(frame, at, 0.07)),
    1,
  );
}

/** Switch shape only on arrival, never while crossing unrelated controls. */
export function cursorOnTarget(
  frame: number,
  path: readonly CursorKey[],
  targets: readonly CursorTarget[],
): CursorKind {
  const p = trackPos(frame, path);
  return (
    targets.find(
      (target) =>
        frame <= target.frame + 8 &&
        Math.hypot(p.x - target.x, p.y - target.y) < 0.01,
    )?.cursor ??
    [...targets]
      .reverse()
      .find(
        (target) =>
          frame > target.frame &&
          Math.hypot(p.x - target.x, p.y - target.y) < 0.01,
      )?.cursor ??
    "default"
  );
}

/** Short shutter samples, capped at 4px. No blur on a held click target. */
export function cursorShutter(frame: number, path: readonly CursorKey[]) {
  const current = trackPos(frame, path);
  return [0.45, 0.3, 0.15].map((offset) => {
    const previous = trackPos(frame - offset, path);
    const dx = previous.x - current.x,
      dy = previous.y - current.y;
    const distance = Math.hypot(dx, dy);
    const limit = distance > 4 ? 4 / distance : 1;
    return {
      x: dx * limit,
      y: dy * limit,
      opacity: distance < 0.25 ? 0 : 0.09,
    };
  });
}
