/**
 * Design tokens for the tilted window: its resting 3D plane, its box on the
 * canvas, and its chrome. Shared by every layout of `TiltedWindowScene` so
 * the window sits in the same plane in every shot of a film.
 *
 * The tilt is only ever applied to layers holding stills or footage. Live
 * product UI must never sit inside it: a lasting transform resamples every
 * glyph of the interface.
 */
export const WINDOW_TILT = {
  perspective: 1400,
  /** Negative brings the right edge toward the camera. */
  rotateY: -13,
  rotateX: 3,
  rotateZ: -1,
  /** The steeper angle a window enters at before it settles. */
  entryRotateY: -24,
} as const;

/** Mirrored, flatter tilt of the two windows in the `pair` layout. */
export const PAIR_TILT = {
  perspective: 1600,
  /** The left window turns this way; the right one mirrors it. */
  rotateY: 8,
  rotateX: 2,
} as const;

/** The single window's box, as fractions of the canvas. */
export const WINDOW_BOX = { x: 0.353, y: 0.174, width: 0.603, height: 0.67 };

/** The pair layout's two window boxes, as fractions of the canvas. */
export const PAIR_BOXES = [
  { x: 0.035, y: 0.18, width: 0.412, height: 0.615 },
  { x: 0.552, y: 0.18, width: 0.412, height: 0.615 },
] as const;

/** The headline column, as fractions of the canvas. */
export const HEADLINE_BOX = { x: 0.062, y: 0.115, width: 0.27 };

/** Window chrome: corner radius in pixels and titlebar height in canvas
 *  fractions. */
export const WINDOW_CHROME = { radius: 10, titlebarHeight: 0.035 };

/** A soft cast shadow, from the `shadow` token or a mix of the background. */
export const WINDOW_SHADOW =
  "0 30px 60px var(--shadow, color-mix(in oklab, var(--background) 60%, transparent))";
