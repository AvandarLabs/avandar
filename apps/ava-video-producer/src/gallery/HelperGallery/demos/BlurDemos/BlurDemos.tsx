import { mix } from "../../../../motion";
import { getHorizontalBlurFilter } from "../../../../motion-components/getHorizontalBlurFilter/getHorizontalBlurFilter";
import { HorizontalBlurFilter } from "../../../../motion-components/HorizontalBlur";
import { MotionSettings } from "../../../../motion-components/MotionSettings/MotionSettings";
import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../../../videoTheme/useVideoTheme";
import css from "../demos.module.css";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { DemoCard } from "../parts/DemoCard";
import { BlurDemosShared } from "./BlurDemosShared/BlurDemosShared";
import { VelocityBlurRails } from "./VelocityBlurRails";
import type { VideoMotion } from "../../../../videoTheme/createVideoMotion/createVideoMotion";
import type { HelperDemoProps } from "../helperDemo.types";
import type { DemoReadout } from "../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";
/** How far the sliding cards travel, in pixels. */
const TRAVEL = 600;
/** Cues of the slide: out, then back. */
const SLIDE_CUES = { out: 10, back: 36 };
/** The blur radius cap, and the blur per pixel travelled in one frame. */
const BLUR = { limit: 40, perPixel: 0.6 };
/** A card sliding right, holding, then sliding back, on the travel curve. */
function _getSlideX({
  frame,
  motion,
}: Readonly<{ frame: number; motion: VideoMotion }>): number {
  const easing = motion.travel.easing;
  const out = motion.ramp(frame, SLIDE_CUES.out, motion.sheet, easing);
  const back = motion.ramp(frame, SLIDE_CUES.back, motion.sheet, easing);
  return mix(out - back, 0, TRAVEL);
}
/** The same slide with the X-only blur filter and with no blur. */
export function HorizontalBlurDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const x = _getSlideX({ frame, motion });
  const previousX = _getSlideX({ frame: frame - 1, motion });
  const amount = Math.min(BLUR.limit, Math.abs(x - previousX) * BLUR.perPixel);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label='<HorizontalBlurFilter id="slide" amount={amount} />'
      readouts={_getHorizontalBlurReadouts(amount)}
    >
      <HorizontalBlurFilter id="slide" amount={amount} />
      <div className={css.rails}>
        <div className={css.cardColumn}>
          <span className={css.caption}>{"X-only blur"}</span>
          <DemoCard
            title="Moving window"
            style={{
              transform: `translateX(${(x - TRAVEL / 2).toFixed(2)}px)`,
              filter: getHorizontalBlurFilter("slide", amount),
            }}
          />
        </div>
        <div className={css.cardColumn}>
          <span className={css.caption}>{"No blur"}</span>
          <DemoCard
            title="Moving window"
            style={{
              transform: `translateX(${(x - TRAVEL / 2).toFixed(2)}px)`,
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}
/** The move every preset row blurs: its cue, length at tempo 1, and travel. */
const MOVE = { at: 15, frames: 24, distance: 700 };
export function VelocityBlurDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const settingsTheme = MotionSettings.useMotionSettingsTheme();
  const easing = motion.curve(useVideoTheme().atomic.easing.inOutCubic);
  const travel = (time: number) => {
    return mix(
      motion.ramp(time, MOVE.at, motion.scale(MOVE.frames), easing),
      0,
      MOVE.distance,
    );
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

/** Formats the blur amount and CSS filter shown beside the comparison. */
function _getHorizontalBlurReadouts(amount: number): DemoReadout[] {
  return [
    {
      name: "amount",
      value: `${DemoTheme.formatReadout({ value: amount, digits: 1 })}px`,
    },
    {
      name: "filter",
      value: getHorizontalBlurFilter("slide", amount) ?? "none",
    },
  ];
}

/** The API call demonstrated by this preview. */
const VELOCITY_BLUR_LABEL =
  "MotionSettings.getVelocityBlur({ distancePerFrame, options: { preset } })";
