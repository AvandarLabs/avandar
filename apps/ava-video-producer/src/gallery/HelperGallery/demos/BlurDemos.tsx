import { mix } from "../../../motion";
import {
  HorizontalBlurFilter,
  getHorizontalBlurFilter,
} from "../../../motion-components/HorizontalBlur";
import {
  getVelocityBlur,
  useMotionSettingsTheme,
} from "../../../motion-components/motionSettings";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { DemoCard } from "./parts/DemoCard";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

/** How far the sliding cards travel, in pixels. */
const TRAVEL = 600;
/** Cues of the slide: out, then back. */
const SLIDE_CUES = { out: 10, back: 36 };
/** The blur radius cap, and the blur per pixel travelled in one frame. */
const BLUR = { limit: 40, perPixel: 0.6 };

/** A card sliding right, holding, then sliding back, on the travel curve. */
function _getSlideX(frame: number, motion: VideoMotion): number {
  const easing = motion.travel.easing;
  const out = motion.ramp(frame, SLIDE_CUES.out, motion.sheet, easing);
  const back = motion.ramp(frame, SLIDE_CUES.back, motion.sheet, easing);
  return mix(out - back, 0, TRAVEL);
}

/** Horizontal blur radius from the distance travelled since the last frame. */
function _getBlurAmount(frame: number, motion: VideoMotion): number {
  return Math.min(
    BLUR.limit,
    Math.abs(_getSlideX(frame, motion) - _getSlideX(frame - 1, motion)) *
      BLUR.perPixel,
  );
}

/** The same slide with the X-only blur filter and with no blur. */
export function HorizontalBlurDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const amount = _getBlurAmount(frame, motion);
  const x = _getSlideX(frame, motion);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label='<HorizontalBlurFilter id="slide" amount={amount} />'
      readouts={[
        { name: "amount", value: `${formatReadout(amount, 1)}px` },
        {
          name: "filter",
          value: getHorizontalBlurFilter("slide", amount) ?? "none",
        },
      ]}
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

const PRESETS = ["gentle", "brisk", "whip"] as const;
/** The move every preset row blurs: its cue, length at tempo 1, and travel. */
const MOVE = { at: 15, frames: 24, distance: 700 };

/** Velocity blur for the same move under three motion presets. */
/** One rail per preset, each block blurred by that preset. */
function VelocityBlurRails({
  x,
  getBlur,
}: {
  x: number;
  getBlur: (preset: (typeof PRESETS)[number]) => number;
}) {
  return (
    <div className={css.timeline}>
      {PRESETS.map((preset) => {
        return (
          <div key={preset} className={css.timelineRow}>
            <span className={css.timelineName}>{preset}</span>
            <div className={css.rail}>
              <span
                className={css.railBlock}
                style={{
                  left: x * 0.85,
                  filter: `blur(${getBlur(preset).toFixed(2)}px)`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function VelocityBlurDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const settingsTheme = useMotionSettingsTheme();
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
  const blur = (preset: (typeof PRESETS)[number]) => {
    return getVelocityBlur(velocity, { preset }, undefined, settingsTheme);
  };
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="getVelocityBlur(distancePerFrame, { preset })"
      readouts={[
        { name: "velocity", value: `${formatReadout(velocity, 1)}px/f` },
        ...PRESETS.map((preset) => {
          return {
            name: preset,
            value: `${formatReadout(blur(preset))}px`,
          };
        }),
      ]}
    >
      <VelocityBlurRails x={x} getBlur={blur} />
    </HelperDemoFrame>
  );
}
