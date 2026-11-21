import { Motion } from "../../../../../motion";
import { DemoTheme } from "../../DemoTheme";
import { getCurveTime } from "../../getCurveTime";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { EasingStage } from "../../parts/EasingStage/EasingStage";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

/** The example custom curve, with its control points drawn as handles. */
const CUSTOM_POINTS = [0.2, 0.8, 0.2, 1] as const;

const CUSTOM_EASING = ((
  ...argumentValues: [x1: number, y1: number, x2: number, y2: number]
) => {
  return Motion.bezier({
    x1: argumentValues[0],
    y1: argumentValues[1],
    x2: argumentValues[2],
    y2: argumentValues[3],
  });
})(...CUSTOM_POINTS);

/** `bezier()` building a custom curve from four control points. */
export function BezierDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const t = getCurveTime(frame);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`bezier(${CUSTOM_POINTS.join(", ")})`}
      readouts={[
        { name: "t", value: DemoTheme.formatReadout({ value: t }) },
        {
          name: "value",
          value: DemoTheme.formatReadout({ value: CUSTOM_EASING(t) }),
        },
      ]}
    >
      <EasingStage easing={CUSTOM_EASING} t={t} handles={CUSTOM_POINTS} />
    </HelperDemoFrame>
  );
}
