import { EASE } from "../../../motion";
import { formatReadout } from "./demoTheme";
import { getCurveTime } from "./getCurveTime";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { EasingStage } from "./parts/EasingStage";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

/** A preview of one `EASE` token, labelled with its definition. */
export function createCurveDemo(
  name: keyof typeof EASE,
): (props: HelperDemoProps) => ReactNode {
  function CurveDemo({ frame, frames, helper }: HelperDemoProps): ReactNode {
    const t = getCurveTime(frame);
    const easing = EASE[name];
    return (
      <HelperDemoFrame
        frame={frame}
        frames={frames}
        label={`EASE.${name} = ${helper.defaults[0]?.value ?? ""}`}
        readouts={[
          { name: "t", value: formatReadout(t) },
          { name: `EASE.${name}(t)`, value: formatReadout(easing(t)) },
        ]}
      >
        <EasingStage easing={easing} t={t} />
      </HelperDemoFrame>
    );
  }
  return CurveDemo;
}
