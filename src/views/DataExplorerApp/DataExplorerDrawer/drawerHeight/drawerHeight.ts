/** Shortest usable expanded drawer height, in pixels. */
export const DRAWER_MIN_HEIGHT = 180;

/** Expanded height the drawer opens at before the user resizes it. */
export const DRAWER_DEFAULT_HEIGHT = 292;

/**
 * Largest share of the canvas the expanded drawer may occupy. The chart is the
 * reason the drawer moved out of a floating window, so it always keeps the
 * remainder.
 */
const DRAWER_MAX_CANVAS_FRACTION = 0.6;

/** Height change per arrow key press on the resize separator, in pixels. */
const DRAWER_KEYBOARD_STEP = 16;

/** Height change per Shift + arrow key press on the resize separator. */
const DRAWER_KEYBOARD_COARSE_STEP = 48;

type ClampOptions = {
  /** Height the pointer drag or keyboard step is asking for. */
  requestedHeight: number;

  /**
   * Height of the canvas the drawer sits in. Pass `0` when the canvas has not
   * been measured yet, which skips the share-of-canvas cap.
   */
  canvasHeight: number;
};

function _resolveMaxHeight(canvasHeight: number): number | undefined {
  if (canvasHeight <= 0) {
    return undefined;
  }
  return Math.max(
    DRAWER_MIN_HEIGHT,
    Math.round(canvasHeight * DRAWER_MAX_CANVAS_FRACTION),
  );
}

/**
 * Constrains a requested expanded drawer height to a whole number of pixels
 * between {@link DRAWER_MIN_HEIGHT} and the share of the canvas the drawer is
 * allowed to take. When the canvas is too short to honor that share the
 * minimum wins, so the drawer never shrinks to an unusable sliver.
 */
export function clampDrawerHeight({
  requestedHeight,
  canvasHeight,
}: ClampOptions): number {
  const maxHeight = _resolveMaxHeight(canvasHeight);
  const flooredHeight = Math.max(
    DRAWER_MIN_HEIGHT,
    Math.round(requestedHeight),
  );
  if (maxHeight === undefined) {
    return flooredHeight;
  }
  return Math.min(flooredHeight, maxHeight);
}

type KeyResizeOptions = {
  /** `KeyboardEvent.key` from the resize separator. */
  key: string;

  /** Whether Shift was held, which switches to the coarse step. */
  isShiftPressed: boolean;

  /** Current expanded height of the drawer. */
  currentHeight: number;

  /** Height of the canvas the drawer sits in. */
  canvasHeight: number;
};

/**
 * Maps a key press on the drawer's resize separator to the height the drawer
 * should take, or `undefined` when the key does not resize. `ArrowUp` grows
 * the drawer because it extends upward from the bottom of the canvas.
 */
export function resolveDrawerHeightForKey({
  key,
  isShiftPressed,
  currentHeight,
  canvasHeight,
}: KeyResizeOptions): number | undefined {
  const step =
    isShiftPressed ? DRAWER_KEYBOARD_COARSE_STEP : DRAWER_KEYBOARD_STEP;

  const requestedHeight =
    key === "ArrowUp" ? currentHeight + step
    : key === "ArrowDown" ? currentHeight - step
    : key === "Home" ? Number.MAX_SAFE_INTEGER
    : key === "End" ? 0
    : undefined;

  if (requestedHeight === undefined) {
    return undefined;
  }

  return clampDrawerHeight({ requestedHeight, canvasHeight });
}
