import { bezier } from "../../../motion";
import {
  getMotionDuration,
  getMotionProgress,
  MOTION_PRESETS,
  resolveMotionSettings,
} from "../../../motion-components/motionSettings";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { getCurveTime } from "./getCurveTime";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { EasingStage } from "./parts/EasingStage";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

/** The example custom curve, with its control points drawn as handles. */
const CUSTOM_POINTS = [0.2, 0.8, 0.2, 1] as const;
const CUSTOM_EASING = bezier(...CUSTOM_POINTS);

/** `bezier()` building a custom curve from four control points. */
export function BezierDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const t = getCurveTime(frame);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`bezier(${CUSTOM_POINTS.join(", ")})`}
      readouts={[
        { name: "t", value: formatReadout(t) },
        { name: "value", value: formatReadout(CUSTOM_EASING(t)) },
      ]}
    >
      <EasingStage easing={CUSTOM_EASING} t={t} handles={CUSTOM_POINTS} />
    </HelperDemoFrame>
  );
}

const PRESETS = Object.keys(MOTION_PRESETS) as Array<
  keyof typeof MOTION_PRESETS
>;
/** The authored travel every preset row retimes. */
const AUTHORED_FRAMES = 24;

/** The five motion presets retiming the same 24-frame move. */
export function MotionPresetsDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`getMotionProgress(frame, 10, ${AUTHORED_FRAMES}, { preset })`}
      readouts={[{ name: "authored", value: `${AUTHORED_FRAMES}f` }]}
    >
      <div className={css.timeline}>
        {PRESETS.map((preset) => {
          const progress = getMotionProgress(frame, 10, AUTHORED_FRAMES, {
            preset,
          });
          const settings = resolveMotionSettings({ preset });
          return (
            <div key={preset} className={css.timelineRow}>
              <span className={css.timelineName}>
                {preset} · {getMotionDuration(AUTHORED_FRAMES, { preset })}f ·{" "}
                {settings.shutterAngle}°
              </span>
              <div className={css.rail}>
                <span
                  className={css.railBlock}
                  style={{ left: progress * 560 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </HelperDemoFrame>
  );
}
