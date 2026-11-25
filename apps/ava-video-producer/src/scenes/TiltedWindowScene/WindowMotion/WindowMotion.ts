import { WindowCameraMotion } from "./WindowCameraMotion";
import { WindowCarouselMotion } from "./WindowCarouselMotion";
import { WindowEntranceMotion } from "./WindowEntranceMotion";
import { WindowReadingMotion } from "./WindowReadingMotion";

/** Samples themed window entrances, exits, reveals, carousels, and cameras. */
export const WindowMotion = {
  /** `classic`'s window stage, the default of every window helper. */
  getClassicWindowStage: WindowReadingMotion.getClassicWindowStage,
  /** The window at rest in its box, on the theme's tilt. */
  getRestingPose: WindowReadingMotion.getRestingPose,
  /**
   * A window whipping in from beyond the right edge: it decelerates into its
   * box over `durationInFrames` (the sheet duration by default) while its
   * tilt
   * settles from the steeper entry angle.
   */
  getWhipEntrance: WindowEntranceMotion.getWhipEntrance,
  /**
   * One window of a pair sliding in from its own outer edge: the left window
   * (`side` 0) from beyond the left edge, the right one from beyond the right
   * edge, decelerating into its box with horizontal blur over
   * `durationInFrames` (the panel duration by default).
   */
  getSideEntrance: WindowEntranceMotion.getSideEntrance,
  /**
   * The clip on a window while its stepped reveal runs: columns of the window
   * rise from the bottom, left to right, as a staircase, then the clip is
   * dropped. The same staircase as the `stepped-column-wipe` shot transition,
   * drawn in the window's own plane.
   */
  getWindowRevealStyle: WindowEntranceMotion.getWindowRevealStyle,
  /**
   * A window whipping off past the left edge: it accelerates away on the
   * theme's departure over `durationInFrames`, its tilt flattening slightly,
   * with blur growing as it speeds up. A longer exit keeps the window visible
   * longer, for example when it slides away under a shot transition that
   * covers it.
   */
  getWhipExit: WindowEntranceMotion.getWhipExit,
  /**
   * Which carousel window is current, the one it is replacing while a slide
   * runs, and the slide's progress (1 when settled or after a cut).
   */
  getCarouselState: WindowCarouselMotion.getCarouselState,
  /**
   * The incoming and outgoing poses of one carousel slide: the incoming
   * window
   * slides in on top from the right, the outgoing one slides left, recedes
   * and fades underneath it. The outgoing window only starts fading once the
   * incoming one has covered most of it (the theme's slide hold), so the
   * field never shows through both half-faded windows (a luminance dip on a
   * field much darker or lighter than the window content).
   */
  getCarouselPoses: WindowCarouselMotion.getCarouselPoses,
  /**
   * The window's rect and how much of its tilt (0 to 1) applies during a
   * pull-back: the full canvas before `atFrame`, its box once landed.
   */
  getPullBack: WindowCameraMotion.getPullBack,
  /**
   * The pair layout's entrance: one joined card flips in on Y from nearly
   * edge-on (`components.WindowTilt.flipStartRotateY`) while travelling in
   * from the left, then splits (0 to 1) into two windows.
   */
  getFlipSplit: WindowCameraMotion.getFlipSplit,
  /**
   * A camera on the window layer only: the window scales by `zoom` about its
   * anchor point on the theme's camera curves, with horizontal blur up to
   * `components.WindowMotion.cameraBlur` while the zoom is changing.
   */
  getWindowCamera: WindowCameraMotion.getWindowCamera,
  /**
   * Which headline is on screen and its opacity. Each headline dissolves out
   * over the press duration, ending where the next one starts.
   */
  getActiveHeadline: WindowReadingMotion.getActiveHeadline,
  /**
   * How far tall window content has scrolled, after quick authored jumps over
   * the press duration.
   */
  getScrollOffset: WindowReadingMotion.getScrollOffset,
};
