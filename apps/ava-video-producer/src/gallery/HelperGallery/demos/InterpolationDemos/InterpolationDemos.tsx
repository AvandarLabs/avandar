import { mix, mixToken } from "../../../../motion";
import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import { useVideoTokens } from "../../../../videoTheme/useVideoTheme";
import css from "../demos.module.css";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { MixTokenSwatches } from "./MixTokenSwatches";
import type { HelperDemoProps } from "../helperDemo.types";
import type { DemoReadout } from "../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";
/** Where the ramp preview's window opens. */
const RAMP_AT = 15;
/** How far the ramp preview's block travels, in pixels. */
const RAMP_DISTANCE = 640;
/**
 * `ramp()` producing clamped progress, and `mix()` turning it into pixels,
 * over the theme's sheet duration on its reveal curve.
 */
export function RampDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const progress = motion.ramp(
    frame,
    RAMP_AT,
    motion.sheet,
    motion.reveal.easing,
  );
  const x = mix(progress, 0, RAMP_DISTANCE);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`mix(ramp(frame, ${RAMP_AT}, DUR.sheet), 0, ${RAMP_DISTANCE})`}
      readouts={_getRampReadouts({ motion, progress, x })}
    >
      <div className={css.rails}>
        <div className={css.rail}>
          <span
            className={css.railLabel}
          >{`mix(progress, 0, ${RAMP_DISTANCE})`}</span>
          <span className={css.railBlock} style={{ left: x }} />
        </div>
        <div className={css.rail}>
          <span className={css.railLabel}>progress</span>
          <span
            className={css.railBlock}
            style={{ width: 56 + progress * RAMP_DISTANCE }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}
/** Cues of the mix token preview: the chip turns on, then off again. */
const MIX_CUES = { on: 15, off: 50 };
export function MixTokenDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const scene = useVideoTokens().color.scene;
  const easing = motion.reveal.easing;
  const t =
    motion.ramp(frame, MIX_CUES.on, motion.chip, easing) *
    (1 - motion.ramp(frame, MIX_CUES.off, motion.chip, easing));
  const color = mixToken(t, scene.border, scene.brand);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="mixToken(t, scene.border, scene.brand)"
      readouts={[
        { name: "t", value: DemoTheme.formatReadout({ value: t }) },
        { name: "css", value: color },
      ]}
    >
      <div className={css.centered}>
        <div className={css.cardColumn}>
          <div className={css.chip} style={{ borderColor: color, color }}>
            Selected
          </div>
          <MixTokenSwatches t={t} />
        </div>
      </div>
    </HelperDemoFrame>
  );
}
const COUNT_TARGET = 1280;
/** When the count starts, and how long it takes at tempo 1. */
const COUNT_AT = 15;
const COUNT_FRAMES = 30;
/** A count rising to its final value instead of snapping to it. */
export function CountToDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const value = motion.count(
    frame,
    COUNT_AT,
    COUNT_TARGET,
    motion.scale(COUNT_FRAMES),
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`motion.count(frame, ${COUNT_AT}, ${COUNT_TARGET}, ${COUNT_FRAMES})`}
      readouts={[
        { name: "value", value: String(value) },
        {
          name: "progress",
          value: DemoTheme.formatReadout({ value: value / COUNT_TARGET }),
        },
      ]}
    >
      <div className={css.centered}>
        <span className={css.bigNumber}>{value.toLocaleString("en")}</span>
      </div>
    </HelperDemoFrame>
  );
}

/** Formats the live readouts displayed by RampDemo. */
function _getRampReadouts({
  motion,
  progress,
  x,
}: Readonly<{
  motion: ReturnType<typeof useVideoMotion>;
  progress: number;
  x: number;
}>): DemoReadout[] {
  return [
    {
      name: "window",
      value: `${RAMP_AT}f to ${DemoTheme.formatReadout({
        value: RAMP_AT + motion.sheet,
        digits: 0,
      })}f`,
    },
    {
      name: "progress",
      value: DemoTheme.formatReadout({ value: progress }),
    },
    {
      name: "x",
      value: `${DemoTheme.formatReadout({ value: x, digits: 1 })}px`,
    },
  ];
}
