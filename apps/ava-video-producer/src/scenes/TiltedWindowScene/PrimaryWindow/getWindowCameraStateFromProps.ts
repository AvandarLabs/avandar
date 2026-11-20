import { TiltedWindowSceneShared } from "../TiltedWindowSceneShared/TiltedWindowSceneShared";
import { WindowMotion } from "../WindowMotion/WindowMotion";
import type {
  WindowCameraState,
  WindowCameraStateOptions,
} from "./PrimaryWindow.types";

/** The pull-back, camera lens, and reveal clip selected by authored props. */
export function getWindowCameraStateFromProps({
  props,
  canvas,
  box,
  stage,
}: Readonly<WindowCameraStateOptions>): WindowCameraState {
  const { frame, enter, camera } = props;
  return {
    pullBack:
      enter?.kind === "pull-back"
        ? WindowMotion.getPullBack({ frame, enter, canvas, box, stage })
        : undefined,
    lens: camera
      ? WindowMotion.getWindowCamera({ frame, keys: camera, box, stage })
      : undefined,
    clipPath: TiltedWindowSceneShared.getWhipRevealClipPath({ props, stage }),
  };
}
