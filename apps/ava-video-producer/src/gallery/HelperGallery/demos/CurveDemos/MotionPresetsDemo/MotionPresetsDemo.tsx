import { MotionSettings } from "../../../../../motion-components/MotionSettings/MotionSettings";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import css from "./MotionPresetsDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

const PRESETS = Object.keys(MotionSettings.MOTION_PRESETS) as Array<
  keyof typeof MotionSettings.MOTION_PRESETS
>;

/** The authored travel every preset row retimes. */
const AUTHORED_FRAMES = 24;

/** The progress, displayed duration, and shutter setting for one preset row. */
function _getPresetMotion({
  frame,
  preset,
  theme,
}: Readonly<{
  frame: number;
  preset: (typeof PRESETS)[number];
  theme: ReturnType<typeof MotionSettings.useMotionSettingsTheme>;
}>): {
  progress: number;
  duration: number;
  shutterAngle: number;
} {
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

/** The five motion presets retiming the same 24-frame move. */
export function MotionPresetsDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`MotionSettings.getMotionProgress({ frame, at: 10, duration: ${AUTHORED_FRAMES}, options: { preset } })`}
      readouts={[{ name: "authored", value: `${AUTHORED_FRAMES}f` }]}
    >
      <div className={css.motionPresetsDemoTimeline}>
        {PRESETS.map((preset) => {
          const { progress, duration, shutterAngle } = _getPresetMotion({
            frame,
            preset,
            theme: settingsTheme,
          });
          return (
            <div key={preset} className={css.motionPresetsDemoTimelineRow}>
              <span className={css.motionPresetsDemoTimelineName}>
                {preset} · {duration}
                f · {shutterAngle}°
              </span>
              <div className={css.motionPresetsDemoRail}>
                <span
                  className={css.motionPresetsDemoRailBlock}
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
