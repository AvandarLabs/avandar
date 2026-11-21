import { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { WINDOW_BOX } from "../../../../../scenes/TiltedWindowScene/windowTilt";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas } from "../../parts/DemoCanvas/DemoCanvas";
import { getCanvasRect } from "../../parts/getCanvasRect";
import { TiltedDemoWindow } from "../../parts/TiltedDemoWindow/TiltedDemoWindow";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const REVEAL = { durationInFrames: 14 };

/** A window rising into the tilted plane through four columns. */
export function WindowRevealDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const stage = useWindowStage();
  const style = WindowMotion.getWindowRevealStyle({
    frame,
    at: 10,
    reveal: REVEAL,
    stage,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        "WindowMotion.getWindowRevealStyle({ frame, at: 10, reveal: { durationInFrames: 14 } })"
      }
      readouts={[
        { name: "clipPath", value: style.clipPath ? "staircase" : "none" },
      ]}
    >
      <DemoCanvas>
        {frame >= 10 ? (
          <TiltedDemoWindow
            box={getCanvasRect(WINDOW_BOX)}
            pose={WindowMotion.getRestingPose(stage)}
            contentStyle={style}
          />
        ) : null}
      </DemoCanvas>
    </HelperDemoFrame>
  );
}
