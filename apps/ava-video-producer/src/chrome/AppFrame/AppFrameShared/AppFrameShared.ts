const BAR = 40;
const HEAD = 68;
/** Diameter of a title bar window dot, in pixels. */
const DOT_SIZE = 8;
/** Defines app title-bar and header dimensions and window-dot sizing. */
export const AppFrameShared = {
  /** Diameter of a title bar window dot, in pixels. */
  DOT_SIZE,
  /** App title bar height in pixels. */
  BAR,
  /** App header height below the title bar, in pixels. */
  HEAD,
} as const;
