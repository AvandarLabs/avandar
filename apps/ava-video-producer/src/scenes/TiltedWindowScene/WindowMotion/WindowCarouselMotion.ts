import { Motion } from "../../../motion";
import { WindowReadingMotion } from "./WindowReadingMotion";
import type { Rect } from "../../layout/SceneGeometry";
import type {
  WindowStage,
  WindowPose,
  CarouselWindow,
} from "./WindowMotion.types";

/**
 * Which carousel window is current, the one it is replacing while a slide
 * runs, and the slide's progress (1 when settled or after a cut).
 */
function _getCarouselState({
  frame,
  windows,
  stage = WindowReadingMotion.getClassicWindowStage(),
}: Readonly<{
  frame: number;
  windows: readonly CarouselWindow[];
  stage?: WindowStage;
}>): {
  current: number;
  previous?: number;
  progress: number;
} {
  const current = windows.reduce((latest, window, index) => {
    return index > 0 && (window.atFrame ?? 0) <= frame ? index : latest;
  }, 0);
  const window = windows[current];
  if (current === 0 || window.swap === "cut") {
    return { current, progress: 1 };
  }
  const { motion } = stage;
  const progress = motion.ramp(
    frame,
    window.atFrame ?? 0,
    motion.chip,
    motion.rise.easing,
  );
  return progress < 1
    ? { current, previous: current - 1, progress }
    : { current, progress: 1 };
}
/**
 * The incoming and outgoing poses of one carousel slide: the incoming window
 * slides in on top from the right, the outgoing one slides left, recedes
 * and fades underneath it. The outgoing window only starts fading once the
 * incoming one has covered most of it (the theme's slide hold), so the
 * field never shows through both half-faded windows (a luminance dip on a
 * field much darker or lighter than the window content).
 */
function _getCarouselPoses({
  progress,
  box,
  stage = WindowReadingMotion.getClassicWindowStage(),
}: Readonly<{
  progress: number;
  box: Rect;
  stage?: WindowStage;
}>): {
  incoming: WindowPose;
  outgoing: WindowPose;
} {
  const { slideBlur, slideHold } = stage.window;
  const resting = WindowReadingMotion.getRestingPose(stage);
  return {
    incoming: {
      ...resting,
      translateX: Motion.mix({
        t: progress,
        from: box.width * 0.65,
        to: 0,
      }),
      opacity: progress,
      blurX: Motion.mix({
        t: progress,
        from: slideBlur,
        to: 0,
      }),
    },
    outgoing: {
      ...resting,
      translateX: Motion.mix({
        t: progress,
        from: 0,
        to: -box.width * 0.28,
      }),
      translateZ: Motion.mix({
        t: progress,
        from: 0,
        to: -120,
      }),
      opacity: 1 - Math.max(0, (progress - slideHold) / (1 - slideHold)),
    },
  };
}
/** Samples a cohesive group of themed window poses. */
export const WindowCarouselMotion = {
  /** Samples the CarouselState motion. */
  getCarouselState: _getCarouselState,
  /** Samples the CarouselPoses motion. */
  getCarouselPoses: _getCarouselPoses,
};
