import { getHorizontalBlurFilter } from "../../../../motion-components/getHorizontalBlurFilter/getHorizontalBlurFilter";
import { positioned } from "../../../positioned";
import { WindowContent } from "../WindowContent/WindowContent";
import { WindowTitlebar } from "../WindowTitlebar/WindowTitlebar";
import type { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import type { useVideoTokens } from "../../../../videoTheme/videoThemeHelpers";
import type { Rect } from "../../../layout/SceneGeometry";
import type { WindowSource } from "../../../scenes.types";
import type {
  WindowStage,
  WindowPose,
} from "../../WindowMotion/WindowMotion.types";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  frame: number;
  rect: Rect;
  pose: WindowPose;
  source: WindowSource;
  tilt: number;
  clipPath: string | undefined;
  transform: string;
  filterId: string;
  scales: ReturnType<typeof useVideoShapeScales>;
  windowTilt: WindowStage["tilt"];
  scene: ReturnType<typeof useVideoTokens>["color"]["scene"];
  boxShadow: string | undefined;
  titlebar: number;
  stage: WindowStage;
  tokens: ReturnType<typeof useVideoTokens>;
};
/** Renders window card plane. */
export function WindowCardPlane({
  frame,
  source,
  titlebar,
  stage,
  rect,
  ...plane
}: Readonly<Props>): ReactNode {
  return (
    <div style={_getWindowCardPlaneStyleFromState({ rect, ...plane })}>
      {titlebar > 0 ? <WindowTitlebar titlebar={titlebar} {...plane} /> : null}
      <WindowContent
        frame={frame}
        source={source}
        height={rect.height - titlebar}
        stage={stage}
      />
    </div>
  );
}

/** Styles a posed window plane while retaining its measured blur and crop. */
function _getWindowCardPlaneStyleFromState({
  rect,
  transform,
  pose,
  filterId,
  scales,
  windowTilt,
  tilt,
  scene,
  boxShadow,
  clipPath,
}: Readonly<
  Omit<Props, "frame" | "source" | "titlebar" | "stage" | "tokens">
>): CSSProperties {
  return {
    ...positioned(rect),
    transform,
    transformOrigin: "50% 50%",
    opacity: pose.opacity,
    filter: getHorizontalBlurFilter({
      id: filterId,
      amount: pose.blurX,
    }),
    borderRadius: scales.corner(windowTilt.chromeRadius) * tilt,
    overflow: "hidden",
    background: scene.background,
    boxShadow,
    clipPath,
  };
}
