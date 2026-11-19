import {
  buildColorWithAlpha,
  elevationToBoxShadow,
} from "../../videoTheme/cssValueHelpers/cssValueHelpers";
import { getClassicStageTheme } from "../stageTheme/stageTheme";

/*
 * The tilted window's boxes on the canvas. Its 3D plane, chrome, and blur
 * are the theme's `components.WindowTilt` and `components.WindowMotion`,
 * shared by every layout of `TiltedWindowScene` so the window sits in the
 * same plane in every shot of a film.
 *
 * The tilt is only ever applied to layers holding stills or footage. Live
 * product UI must never sit inside it: a lasting transform resamples every
 * glyph of the interface.
 */

const CLASSIC = getClassicStageTheme();
const CLASSIC_TILT = CLASSIC.components.WindowTilt;

/** Share of the scene background a window's fallback shadow takes. */
export const WINDOW_SHADOW_FALLBACK_ALPHA = 0.6;

/**
 * The single window's resting plane in `classic`, for callers without a
 * theme. `rotateY` is negative to bring the right edge toward the camera,
 * and `entryRotateY` is the steeper angle a window enters at.
 */
export const WINDOW_TILT = {
  perspective: CLASSIC_TILT.perspective,
  rotateY: CLASSIC_TILT.rotateY,
  rotateX: CLASSIC_TILT.rotateX,
  rotateZ: CLASSIC_TILT.rotateZ,
  entryRotateY: CLASSIC_TILT.entryRotateY,
} as const;

/**
 * The mirrored, flatter tilt of the two `pair` windows in `classic`, for
 * callers without a theme. The joined card flips in through the longer
 * `flipPerspective` lens.
 */
export const PAIR_TILT = {
  perspective: CLASSIC_TILT.pairPerspective,
  rotateY: CLASSIC_TILT.pairRotateY,
  rotateX: CLASSIC_TILT.pairRotateX,
  flipPerspective: CLASSIC_TILT.flipPerspective,
} as const;

/**
 * The single window's box, as fractions of the canvas, before the tilt.
 * The perspective tilt draws the window about 3% of the width further right
 * and about 10% taller than this box, so the box is set to land the window
 * as drawn on `x 35.1%, y 16.7%, w 60.5%, h 68.2%` of the frame.
 */
export const WINDOW_BOX = { x: 0.321, y: 0.203, width: 0.606, height: 0.62 };

/**
 * A taller single window that reaches close to the top and bottom edges,
 * for example the window a full-bleed shot pulls back into when its
 * contents need more height than the default box. Drawn with the tilt, it
 * lands on about `x 35.8%, y 8.9%, w 58%, h 82.8%` of the frame.
 */
export const WINDOW_BOX_TALL = {
  x: 0.331,
  y: 0.126,
  width: 0.581,
  height: 0.757,
};

/** The single window's boxes by name, as a plan's `windowBox` picks them. */
export const WINDOW_BOXES = {
  default: WINDOW_BOX,
  tall: WINDOW_BOX_TALL,
} as const;

/** The name of one single-window box. */
export type WindowBoxName = keyof typeof WINDOW_BOXES;

/** The pair layout's two window boxes, as fractions of the canvas. */
export const PAIR_BOXES = [
  { x: 0.035, y: 0.18, width: 0.412, height: 0.615 },
  { x: 0.552, y: 0.18, width: 0.412, height: 0.615 },
] as const;

/** The headline column, as fractions of the canvas. */
export const HEADLINE_BOX = { x: 0.062, y: 0.115, width: 0.27 };

/**
 * Window chrome in `classic`, for callers without a theme: corner radius in
 * pixels and titlebar height in canvas fractions.
 */
export const WINDOW_CHROME = {
  radius: CLASSIC_TILT.chromeRadius,
  titlebarHeight: CLASSIC_TILT.titlebarHeight,
};

/**
 * The window's cast shadow in `classic`, for callers without a theme:
 * `elevation.window` in a mix of the scene background.
 */
export const WINDOW_SHADOW = elevationToBoxShadow({
  layers: CLASSIC.semantic.elevation.window.layers,
  color: buildColorWithAlpha(
    CLASSIC.semantic.color.scene.background,
    WINDOW_SHADOW_FALLBACK_ALPHA,
  ),
});
