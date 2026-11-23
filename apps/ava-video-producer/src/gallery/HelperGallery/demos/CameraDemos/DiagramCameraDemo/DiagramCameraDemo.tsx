import { CameraTrack } from "../../../../../motion-components/CameraTrack/CameraTrack";
import { DiagramCamera } from "../../../../../motion-components/DiagramCamera/DiagramCamera";
import { MotionSettings } from "../../../../../motion-components/MotionSettings/MotionSettings";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoDiagram } from "../../parts/DemoDiagram/DemoDiagram";
import { CameraDemosGalleryValues } from "../CameraDemosGalleryValues/CameraDemosGalleryValues";
import css from "./DiagramCameraDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

/** The same route through the camera component, with travel-only blur. */
export function DiagramCameraDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  const pose = CameraTrack.getPose({
    keys: CameraDemosGalleryValues.TRACK,
    frame,
    enabled: true,
    options: undefined,
    viewport: undefined,
    theme: settingsTheme,
  });
  const isMoving = CameraTrack.isMoving({
    keys: CameraDemosGalleryValues.TRACK,
    frame,
    options: undefined,
    theme: settingsTheme,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label='<DiagramCamera track={keys} preset="balanced" render={...} />'
      readouts={[
        { name: "zoom", value: DemoTheme.formatReadout({ value: pose.zoom }) },
        { name: "blur", value: isMoving ? "shutter open" : "at rest" },
      ]}
    >
      <div className={css.diagramCameraDemoCentered}>
        <div className={css.diagramCameraDemoCameraBox}>
          <DiagramCamera
            track={CameraDemosGalleryValues.TRACK}
            preset="balanced"
            render={() => {
              return <DemoDiagram />;
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}
