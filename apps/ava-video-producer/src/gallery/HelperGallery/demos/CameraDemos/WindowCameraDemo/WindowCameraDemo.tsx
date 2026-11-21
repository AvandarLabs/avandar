import { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { type WindowCameraKey } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion.types";
import { WINDOW_BOX } from "../../../../../scenes/TiltedWindowScene/windowTilt";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas } from "../../parts/DemoCanvas/DemoCanvas";
import { getCanvasRect } from "../../parts/getCanvasRect";
import { TiltedDemoWindow } from "../../parts/TiltedDemoWindow/TiltedDemoWindow";
import css from "./WindowCameraDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { DemoReadout } from "../../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

const WINDOW_KEYS: WindowCameraKey[] = [
  { at: 0, x: 0.5, y: 0.5, zoom: 1 },
  { at: 20, x: 0.5, y: 0.5, zoom: 1 },
  { at: 45, x: 0.7, y: 0.45, zoom: 1.6, ease: "push" },
  { at: 80, x: 0.7, y: 0.45, zoom: 1.6 },
  { at: 105, x: 0.5, y: 0.5, zoom: 1 },
];

/** Formats the live readouts displayed by WindowCameraDemo. */
function _getWindowCameraReadouts(
  lens: ReturnType<typeof WindowMotion.getWindowCamera>,
): DemoReadout[] {
  return [
    {
      name: "scale",
      value: DemoTheme.formatReadout({ value: lens.scale }),
    },
    {
      name: "origin",
      value: `${DemoTheme.formatReadout({ value: lens.originX })}, ${DemoTheme.formatReadout({ value: lens.originY })}`,
    },
    {
      name: "blurX",
      value: `${DemoTheme.formatReadout({ value: lens.blurX, digits: 1 })}px`,
    },
  ];
}

/** A push into one area of the window, scaling only the window layer. */
export function WindowCameraDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const stage = useWindowStage();
  const box = getCanvasRect(WINDOW_BOX);
  const lens = WindowMotion.getWindowCamera({
    frame,
    keys: WINDOW_KEYS,
    box,
    stage,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={"WindowMotion.getWindowCamera({ frame, keys, box })"}
      readouts={_getWindowCameraReadouts(lens)}
    >
      <DemoCanvas>
        <div
          className={css.windowCameraDemoLayer}
          style={{
            transformOrigin: `${box.x + lens.originX * box.width}px ${box.y + lens.originY * box.height}px`,
            transform: `scale(${lens.scale.toFixed(4)})`,
          }}
        >
          <TiltedDemoWindow
            box={box}
            pose={{ ...WindowMotion.getRestingPose(stage), blurX: lens.blurX }}
          />
        </div>
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
