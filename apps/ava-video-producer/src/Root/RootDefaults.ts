/** Shared frames per second for the starter compositions. */
export const FPS = 30;

/** 1600x1000 is 8:5, a wide tile, the shape a demo takes when it sits in a
 * page section rather than in a video player. For docs, a social post or an
 * app store listing you probably want 16:9 (1600x900) or 1:1; change these
 * two numbers and the scale filter in scripts/render.sh together.
 *
 * Whatever you pick, deliver on a 16-aligned size: 1000 % 16 = 8, which
 * costs a partial macroblock row on every frame for nothing. This canvas
 * ships at 1536x960, same aspect, both dimensions clean. */
export const WIDTH = 1600;

/** Shared starter composition canvas height, in pixels. */
export const HEIGHT = 1000;
