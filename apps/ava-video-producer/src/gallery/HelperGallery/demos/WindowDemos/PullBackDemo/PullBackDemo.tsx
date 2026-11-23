import { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { WINDOW_BOX } from "../../../../../scenes/TiltedWindowScene/windowTilt";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DEMO_CANVAS, DemoCanvas } from "../../parts/DemoCanvas/DemoCanvas";
import { getCanvasRect } from "../../parts/getCanvasRect";
import { TiltedDemoWindow } from "../../parts/TiltedDemoWindow/TiltedDemoWindow";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const BOX = getCanvasRect(WINDOW_BOX);

const PULL_BACK = { kind: "pull-back", atFrame: 25 } as const;

/** Renders PullBackDemo for live helper catalog previews. */
export function PullBackDemo({ frame, frames }: Readonly<Props>): ReactNode {
  const stage = useWindowStage();
  const { rect, tilt } = WindowMotion.getPullBack({
    frame,
    enter: PULL_BACK,
    canvas: DEMO_CANVAS,
    box: BOX,
    stage,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        'WindowMotion.getPullBack({ frame, enter: { kind: "pull-back", atFrame: 25 }, canvas, box })'
      }
      readouts={[
        {
          name: "width",
          value: `${DemoTheme.formatReadout({ value: rect.width, digits: 0 })}px`,
        },
        { name: "tilt", value: DemoTheme.formatReadout({ value: tilt }) },
      ]}
    >
      <DemoCanvas>
        <TiltedDemoWindow
          box={rect}
          pose={WindowMotion.getRestingPose(stage)}
          tilt={tilt}
        />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
