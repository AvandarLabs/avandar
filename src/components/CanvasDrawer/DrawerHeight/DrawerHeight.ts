const MIN_HEIGHT = 180;

const DEFAULT_HEIGHT = 292;

/**
 * Largest share of the shared region the expanded drawer may occupy. The
 * canvas always keeps the remainder, so it stays readable at any drawer
 * height.
 */
const MAX_AVAILABLE_FRACTION = 0.6;

/** Height change per arrow key press on the resize separator, in pixels. */
const KEYBOARD_STEP = 16;

/** Height change per Shift + arrow key press on the resize separator. */
const KEYBOARD_COARSE_STEP = 48;

type AvailableHeightOptions = {
  /**
   * Height of the whole region the canvas and the drawer split between them.
   * Pass `0` when that region has not been measured yet, which skips the
   * share-of-region cap.
   */
  availableHeight: number;
};

type ClampOptions = AvailableHeightOptions & {
  /** Height the pointer drag or keyboard step is asking for. */
  requestedHeight: number;
};

type KeyResizeOptions = AvailableHeightOptions & {
  /** `KeyboardEvent.key` from the resize separator. */
  key: string;

  /** Whether Shift was held, which switches to the coarse step. */
  isShiftPressed: boolean;

  /** Current expanded height of the drawer. */
  currentHeight: number;
};

function _getMaxHeight(availableHeight: number): number | undefined {
  return availableHeight <= 0 ? undefined : (
      Math.max(MIN_HEIGHT, Math.round(availableHeight * MAX_AVAILABLE_FRACTION))
    );
}

function _clamp({ requestedHeight, availableHeight }: ClampOptions): number {
  const maxHeight = _getMaxHeight(availableHeight);
  const flooredHeight = Math.max(MIN_HEIGHT, Math.round(requestedHeight));
  return maxHeight === undefined ? flooredHeight : (
      Math.min(flooredHeight, maxHeight)
    );
}

function _getHeightForKey({
  key,
  isShiftPressed,
  currentHeight,
  availableHeight,
}: KeyResizeOptions): number | undefined {
  const step = isShiftPressed ? KEYBOARD_COARSE_STEP : KEYBOARD_STEP;

  // `key` is an open DOM string rather than a closed union, so there is no
  // exhaustiveness for `matchLiteral` to enforce here.
  const requestedHeight =
    key === "ArrowUp" ? currentHeight + step
    : key === "ArrowDown" ? currentHeight - step
    : key === "Home" ? Number.MAX_SAFE_INTEGER
    : key === "End" ? 0
    : undefined;

  return requestedHeight === undefined ? undefined : (
      _clamp({ requestedHeight, availableHeight })
    );
}

/**
 * Height rules for a canvas-docked drawer: the bounds it may occupy in the
 * region it shares with the canvas above it, and how the resize separator's
 * keyboard controls move within them.
 *
 * `availableHeight` throughout is the height of that whole shared region, not
 * the canvas's current height. The canvas is the drawer's sibling, so its
 * measured height already shrinks by whatever the drawer takes; capping
 * against it directly would make the ceiling chase the drawer down as it grows
 * and settle far below the intended share.
 */
export const DrawerHeight = {
  /** Shortest usable expanded drawer height, in pixels. */
  MIN_HEIGHT,

  /** Expanded height the drawer opens at before the user resizes it. */
  DEFAULT_HEIGHT,

  /**
   * Constrains a requested expanded drawer height to a whole number of pixels
   * between `MIN_HEIGHT` and the share of the region the drawer is allowed to
   * take. When the region is too short to honor that share the minimum wins,
   * so the drawer never shrinks to an unusable sliver.
   */
  clamp: _clamp,

  /**
   * The tallest the drawer may be inside a region of `availableHeight`, or
   * `undefined` when that region has not been measured and so imposes no cap.
   */
  getMaxHeight: _getMaxHeight,

  /**
   * Maps a key press on the drawer's resize separator to the height the
   * drawer should take, or `undefined` when the key does not resize.
   * `ArrowUp` grows the drawer because it extends upward from the bottom of
   * the region.
   */
  getHeightForKey: _getHeightForKey,
} as const;
