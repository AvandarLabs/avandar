import type { WindowMotion } from "../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { type WindowPose } from "../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion.types";
import { DemoTheme } from "../DemoTheme";
import type { DemoReadout } from "../HelperDemoFrame/HelperDemoFrame";
/** The pose readouts every window preview shows. */
function _getPoseReadouts(pose: WindowPose) {
  return [
    {
      name: "translateX",
      value: DemoTheme.formatReadout({ value: pose.translateX, digits: 1 }),
    },
    {
      name: "rotateY",
      value: `${DemoTheme.formatReadout({ value: pose.rotateY, digits: 1 })}°`,
    },
    {
      name: "blurX",
      value: `${DemoTheme.formatReadout({ value: pose.blurX, digits: 1 })}px`,
    },
  ];
}
/** Formats the live readouts displayed by CarouselDemo. */
function _getCarouselReadouts({
  state,
  poses,
  isSliding,
}: Readonly<{
  state: ReturnType<typeof WindowMotion.getCarouselState>;
  poses: ReturnType<typeof WindowMotion.getCarouselPoses>;
  isSliding: boolean;
}>): DemoReadout[] {
  return [
    { name: "current", value: String(state.current) },
    {
      name: "progress",
      value: DemoTheme.formatReadout({ value: state.progress }),
    },
    {
      name: "outgoing opacity",
      value: DemoTheme.formatReadout({
        value: isSliding ? poses.outgoing.opacity : 0,
      }),
    },
  ];
}
/** Formats the live readouts displayed by FlipSplitDemo. */
function _getFlipReadouts(
  flip: ReturnType<typeof WindowMotion.getFlipSplit>,
): DemoReadout[] {
  return [
    {
      name: "rotateY",
      value: `${DemoTheme.formatReadout({ value: flip.rotateY, digits: 1 })}°`,
    },
    {
      name: "translateX",
      value: DemoTheme.formatReadout({ value: flip.translateX, digits: 1 }),
    },
    {
      name: "split",
      value: DemoTheme.formatReadout({ value: flip.split }),
    },
  ];
}
/**
 * Formats the live pose, carousel, and flip values displayed by window helper
 * previews.
 */
export const WindowDemoReadouts = {
  /** The window translation, rotation, and blur readouts. */
  getPoseReadouts: _getPoseReadouts,
  /** The current carousel item, slide progress, and outgoing opacity. */
  getCarouselReadouts: _getCarouselReadouts,
  /** The joined pair's rotation, translation, and split progress. */
  getFlipReadouts: _getFlipReadouts,
} as const;
