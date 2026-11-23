/** Frame the shared timeline's playhead starts at. */
export const START = 10;
/** Frames shown on the shared ruler. */
export const RULER_FRAMES = 20;
/** Pixels per frame on the shared ruler. */
export const FRAME_WIDTH = 30;

/** Elapsed frames since the playhead started, held at the ruler's end. */
export function getElapsed(frame: number): number {
  return Math.min(RULER_FRAMES, Math.max(0, frame - START));
}
