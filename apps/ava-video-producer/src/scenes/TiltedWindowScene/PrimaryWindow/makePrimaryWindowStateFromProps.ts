import { TiltedWindowSceneShared } from "../TiltedWindowSceneShared/TiltedWindowSceneShared";
import { WindowMotion } from "../WindowMotion/WindowMotion";
import { WINDOW_BOXES } from "../windowTilt";
import { getWindowCameraStateFromProps } from "./getWindowCameraStateFromProps";
import type { WindowStage } from "../WindowMotion/WindowMotion.types";
import type { Props, PrimaryWindowState } from "./PrimaryWindow.types";

/** Derives primary-window placement and animation state from authored props. */
export function makePrimaryWindowStateFromProps({
  props,
  stage,
}: Readonly<{
  props: Readonly<Omit<Props, "chrome">>;
  stage: WindowStage;
}>): PrimaryWindowState {
  const { frame, width, height, windows = [], windowBox = "default" } = props;
  const canvas = { width, height };
  const box = TiltedWindowSceneShared.toPixels(WINDOW_BOXES[windowBox], canvas);
  const carousel = WindowMotion.getCarouselState({ frame, windows, stage });
  return {
    frame,
    height,
    windows,
    box,
    carousel,
    base: TiltedWindowSceneShared.getBasePose({ props, box, stage }),
    slide: WindowMotion.getCarouselPoses({
      progress: carousel.progress,
      box,
      stage,
    }),
    ...getWindowCameraStateFromProps({ props, canvas, box, stage }),
  };
}
