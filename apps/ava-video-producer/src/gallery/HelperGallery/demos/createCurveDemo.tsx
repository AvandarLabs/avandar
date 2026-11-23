import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import { DemoTheme } from "./DemoTheme";
import { getCurveTime } from "./getCurveTime";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { EasingStage } from "./parts/EasingStage/EasingStage";
import type { ResolvedVideoTheme } from "../../../videoTheme/videoTheme.types";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";
/** A named curve of the theme's easing scale, as `EASE` names it. */
export type DemoCurveName = keyof ResolvedVideoTheme["atomic"]["easing"];
/**
 * A preview of one `EASE` curve as the video theme defines it
 * (`atomic.easing.<name>`), labelled with its definition.
 */
export function createCurveDemo(
  name: DemoCurveName,
): (props: HelperDemoProps) => ReactNode {
  function CurveDemo({ frame, frames }: HelperDemoProps): ReactNode {
    const motion = useVideoMotion();
    const curve = useVideoTheme().atomic.easing[name];
    const t = getCurveTime(frame);
    const easing = motion.curve(curve);
    return (
      <HelperDemoFrame
        frame={frame}
        frames={frames}
        label={`EASE.${name} = ${
          "powerInOut" in curve
            ? `powerInOut(${curve.powerInOut})`
            : `bezier(${curve.join(", ")})`
        }`}
        readouts={[
          { name: "t", value: DemoTheme.formatReadout({ value: t }) },
          {
            name: `EASE.${name}(t)`,
            value: DemoTheme.formatReadout({ value: easing(t) }),
          },
        ]}
      >
        <EasingStage easing={easing} t={t} />
      </HelperDemoFrame>
    );
  }
  return CurveDemo;
}
