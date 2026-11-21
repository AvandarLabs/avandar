import type { Rect } from "../../layout/SceneGeometry";
import type { SizedProps } from "../TiltedWindowSceneShared/TiltedWindowSceneShared.types";
import type { WindowMotion } from "../WindowMotion/WindowMotion";
import type {
  WindowPose,
  WindowStage,
} from "../WindowMotion/WindowMotion.types";

/** Inputs used to place, move, and draw the primary window. */
export type Props = Pick<
  SizedProps,
  | "frame"
  | "width"
  | "height"
  | "windows"
  | "camera"
  | "enter"
  | "exit"
  | "windowBox"
  | "chrome"
>;

/** The viewport and stage used to derive a window camera frame. */
export type WindowCameraStateOptions = {
  props: Readonly<Pick<Props, "frame" | "camera" | "enter">>;
  canvas: { width: number; height: number };
  box: Rect;
  stage: WindowStage;
};

/** Camera effects applied to the primary window at one frame. */
export type WindowCameraState = {
  pullBack: ReturnType<typeof WindowMotion.getPullBack> | undefined;
  lens: ReturnType<typeof WindowMotion.getWindowCamera> | undefined;
  clipPath: string | undefined;
};

/** The primary window's sources, placement, and animation state at a frame. */
export type PrimaryWindowState = WindowCameraState & {
  frame: number;
  height: number;
  windows: NonNullable<Props["windows"]>;
  box: Rect;
  base: WindowPose;
  carousel: ReturnType<typeof WindowMotion.getCarouselState>;
  slide: ReturnType<typeof WindowMotion.getCarouselPoses>;
};
