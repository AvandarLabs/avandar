import { Motion } from "../../../../../motion";
import { MotionSettings } from "../../../../../motion-components/MotionSettings/MotionSettings";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../../../../videoTheme/videoThemeHelpers";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import { BlurDemosShared } from "../BlurDemosShared/BlurDemosShared";
import { VelocityBlurRails } from "../VelocityBlurRails/VelocityBlurRails";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { ReactNode } from "react";

/** The move every preset row blurs: its cue, length at tempo 1, and travel. */
const MOVE = { at: 15, frames: 24, distance: 700 };

/** The API call demonstrated by this preview. */
const VELOCITY_BLUR_LABEL =
  "MotionSettings.getVelocityBlur({ distancePerFrame, options: { preset } })";

/** Renders VelocityBlurDemo with the authored gallery behavior. */
export function VelocityBlurDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  const easing = motion.curve(useVideoTheme().atomic.easing.inOutCubic);
  const travel = (time: number) => {
    return Motion.mix({
      t: motion.ramp(time, MOVE.at, motion.scale(MOVE.frames), easing),
      from: 0,
      to: MOVE.distance,
    });
  };
  const x = travel(frame);
  const velocity = Math.abs(x - travel(frame - 1));
  const blur = (preset: (typeof BlurDemosShared.PRESETS)[number]) => {
    return MotionSettings.getVelocityBlur({
      distancePerFrame: velocity,
      options: { preset },
      theme: settingsTheme,
    });
  };
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={VELOCITY_BLUR_LABEL}
      readouts={[
        {
          name: "velocity",
          value: `${DemoTheme.formatReadout({ value: velocity, digits: 1 })}px/f`,
        },
        ...BlurDemosShared.PRESETS.map((preset) => {
          return {
            name: preset,
            value: `${DemoTheme.formatReadout({ value: blur(preset) })}px`,
          };
        }),
      ]}
    >
      <VelocityBlurRails x={x} getBlur={blur} />
    </HelperDemoFrame>
  );
}
