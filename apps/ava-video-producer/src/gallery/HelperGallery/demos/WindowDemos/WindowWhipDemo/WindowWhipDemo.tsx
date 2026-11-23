import { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { WINDOW_BOX } from "../../../../../scenes/TiltedWindowScene/windowTilt";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DEMO_CANVAS, DemoCanvas } from "../../parts/DemoCanvas/DemoCanvas";
import { getCanvasRect } from "../../parts/getCanvasRect";
import { TiltedDemoWindow } from "../../parts/TiltedDemoWindow/TiltedDemoWindow";
import { WindowDemoReadouts } from "../WindowDemoReadouts";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const BOX = getCanvasRect(WINDOW_BOX);

const WHIP_IN = 6;

const WHIP_OUT = 60;

/** Renders WindowWhipDemo for live helper catalog previews. */
export function WindowWhipDemo({ frame, frames }: Readonly<Props>): ReactNode {
  const stage = useWindowStage();
  const pose =
    frame < WHIP_OUT
      ? WindowMotion.getWhipEntrance({
          frame,
          at: WHIP_IN,
          canvas: DEMO_CANVAS,
          box: BOX,
          durationInFrames: undefined,
          stage,
        })
      : WindowMotion.getWhipExit({
          frame,
          at: WHIP_OUT,
          box: BOX,
          durationInFrames: undefined,
          stage,
        });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`WindowMotion.getWhipEntrance({ frame, at: ${WHIP_IN}, canvas, box }) → WindowMotion.getWhipExit({ frame, at: ${WHIP_OUT}, box })`}
      readouts={WindowDemoReadouts.getPoseReadouts(pose)}
    >
      <DemoCanvas>
        <TiltedDemoWindow box={BOX} pose={pose} />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
