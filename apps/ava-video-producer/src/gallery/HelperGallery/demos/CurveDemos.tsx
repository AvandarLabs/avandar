import { bezier } from "../../../motion";
import { MotionSettings } from "../../../motion-components/MotionSettings/MotionSettings";
import css from "./demos.module.css";
import { DemoTheme } from "./DemoTheme";
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
const PRESETS = Object.keys(MotionSettings.MOTION_PRESETS) as Array<
  keyof typeof MotionSettings.MOTION_PRESETS
>;
/** The authored travel every preset row retimes. */
const AUTHORED_FRAMES = 24;
/** The five motion presets retiming the same 24-frame move. */
export function MotionPresetsDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`MotionSettings.getMotionProgress({ frame, at: 10, duration: ${AUTHORED_FRAMES}, options: { preset } })`}
      readouts={[{ name: "authored", value: `${AUTHORED_FRAMES}f` }]}
    >
      <div className={css.timeline}>
        {PRESETS.map((preset) => {
          const { progress, duration, shutterAngle } = _getPresetMotion({
            frame,
            preset,
            theme: settingsTheme,
          });
          return (
            <div key={preset} className={css.timelineRow}>
              <span className={css.timelineName}>
                {preset} · {duration}
                f · {shutterAngle}°
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

/** The progress, displayed duration, and shutter setting for one preset row. */
function _getPresetMotion({
  frame,
  preset,
  theme,
}: Readonly<{
  frame: number;
  preset: (typeof PRESETS)[number];
  theme: ReturnType<typeof MotionSettings.useMotionSettingsTheme>;
}>): { progress: number; duration: number; shutterAngle: number } {
  const options = { preset };
  const settings = MotionSettings.resolveMotionSettings({ options, theme });
  return {
    progress: MotionSettings.getMotionProgress({
      frame,
      at: 10,
      duration: AUTHORED_FRAMES,
      options,
      theme,
    }),
    duration: MotionSettings.getMotionDuration({
      frames: AUTHORED_FRAMES,
      options,
      theme,
    }),
    shutterAngle: settings.shutterAngle,
  };
}
