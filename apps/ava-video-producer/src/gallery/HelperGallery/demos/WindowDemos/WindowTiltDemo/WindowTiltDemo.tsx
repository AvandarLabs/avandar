import { useWindowStage } from "../../../../../scenes/TiltedWindowScene/useWindowStage";
import { WindowMotion } from "../../../../../scenes/TiltedWindowScene/WindowMotion/WindowMotion";
import { WINDOW_BOX } from "../../../../../scenes/TiltedWindowScene/windowTilt";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { DemoCanvas } from "../../parts/DemoCanvas/DemoCanvas";
import { getCanvasRect } from "../../parts/getCanvasRect";
import { TiltedDemoWindow } from "../../parts/TiltedDemoWindow/TiltedDemoWindow";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const BOX = getCanvasRect(WINDOW_BOX);

/** Cues of the tilt preview: into the resting tilt, then back to flat. */
const TILT_CUES = { in: 10, out: 60 };

/** Renders WindowTiltDemo for live helper catalog previews. */
export function WindowTiltDemo({ frame, frames }: Readonly<Props>): ReactNode {
  const stage = useWindowStage();
  const { motion } = stage;
  const easing = motion.travel.easing;
  const tilt =
    motion.ramp(frame, TILT_CUES.in, motion.hero, easing) *
    (1 - motion.ramp(frame, TILT_CUES.out, motion.hero, easing));
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`perspective(${stage.tilt.perspective}px) rotateY(${stage.tilt.rotateY}°) rotateX(${stage.tilt.rotateX}°) rotateZ(${stage.tilt.rotateZ}°)`}
      readouts={[
        { name: "tilt share", value: DemoTheme.formatReadout({ value: tilt }) },
        {
          name: "rotateY",
          value: `${DemoTheme.formatReadout({
            value: stage.tilt.rotateY * tilt,
            digits: 1,
          })}°`,
        },
      ]}
    >
      <DemoCanvas>
        <TiltedDemoWindow
          box={BOX}
          pose={WindowMotion.getRestingPose(stage)}
          tilt={tilt}
        />
      </DemoCanvas>
    </HelperDemoFrame>
  );
}

type Props = HelperDemoProps;
