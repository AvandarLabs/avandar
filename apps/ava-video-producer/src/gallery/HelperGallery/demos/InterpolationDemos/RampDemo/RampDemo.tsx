import { Motion } from "../../../../../motion";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { DemoTheme } from "../../DemoTheme";
import { HelperDemoFrame } from "../../HelperDemoFrame/HelperDemoFrame";
import css from "./RampDemo.module.css";
import type { HelperDemoProps } from "../../helperDemo.types";
import type { DemoReadout } from "../../HelperDemoFrame/HelperDemoFrame";
import type { ReactNode } from "react";

/** Where the ramp preview's window opens. */
const RAMP_AT = 15;

/** How far the ramp preview's block travels, in pixels. */
const RAMP_DISTANCE = 640;

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

/**
 * `ramp()` producing clamped progress, and `mix()` turning it into pixels,
 * over the theme's sheet duration on its reveal curve.
 */
export function RampDemo({
  frame,
  frames,
}: Readonly<HelperDemoProps>): ReactNode {
  const motion = useVideoMotion();
  const progress = motion.ramp(
    frame,
    RAMP_AT,
    motion.sheet,
    motion.reveal.easing,
  );
  const x = Motion.mix({
    t: progress,
    from: 0,
    to: RAMP_DISTANCE,
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`mix(ramp(frame, ${RAMP_AT}, DUR.sheet), 0, ${RAMP_DISTANCE})`}
      readouts={_getRampReadouts({ motion, progress, x })}
    >
      <div className={css.rampDemoRails}>
        <div className={css.rampDemoRail}>
          <span
            className={css.rampDemoRailLabel}
          >{`mix(progress, 0, ${RAMP_DISTANCE})`}</span>
          <span className={css.rampDemoRailBlock} style={{ left: x }} />
        </div>
        <div className={css.rampDemoRail}>
          <span className={css.rampDemoRailLabel}>progress</span>
          <span
            className={css.rampDemoRailBlock}
            style={{ width: 56 + progress * RAMP_DISTANCE }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}
