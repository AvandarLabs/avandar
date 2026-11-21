// Thresholds behind `scripts/checkFrames.ts`. Do not "fix" a failure by
// loosening the thresholds below.

/**
 * How much better than its neighbours a frame's halves match to count as tiled,
 * in dB.
 */
export const TILE_SPIKE_DB = 3;

/**
 * The largest allowed frame-to-frame change of average luma, on a 0-255 scale.
 */
export const LUMA_JUMP = 25;

/**
 * Below this luma contrast (max minus min) a frame is nearly one flat colour,
 * so its halves match by definition and it cannot be judged for tiling.
 * Measured: tiled frames sit at 206-219 of contrast, the dimmest dissolve
 * frame worth keeping sits at 71.
 */
export const FLAT_CONTRAST_LIMIT = 120;

/**
 * The half match a frame bordering a near-uniform frame needs before it can
 * count as tiled, in dB. Such a frame is an entrance from (or exit into) a
 * flat field, so it is mostly that field itself: its halves match better
 * than its detailed neighbours for the same reason a flat frame's do, and
 * the neighbour comparison alone flags it. A tiled frame's halves are copies
 * of each other, so they match far better still.
 *
 * Measured: the one frame bordering a near-uniform frame that spiked in a
 * 2357-frame storyboard render matched at 19.3 dB (a heading and a blurred
 * window entering an empty field). 2x3 grids of eleven frames of that render
 * matched at 44.8-54.7 dB, and of ffmpeg's noisy `testsrc2` pattern at
 * 320x180 at 38.7-39.5 dB. This floor sits between the two.
 */
export const COPY_MATCH_DB = 30;

/**
 * How many frames after a declared cut its luma may not swing back. A jump
 * and a swing back is one flash; WCAG 2.3.1 allows at most three flashes a
 * second, which is one per 10 frames at the storyboard's 30 fps.
 */
export const CUT_REVERSAL_FRAMES = 10;

/** Command-line usage printed when `checkFrames` receives invalid flags. */
export const FRAME_GATE_USAGE =
  "usage: node --import tsx scripts/checkFrames.ts <video> [--standalone] [--declared-cuts <frame>,<frame>...]";
