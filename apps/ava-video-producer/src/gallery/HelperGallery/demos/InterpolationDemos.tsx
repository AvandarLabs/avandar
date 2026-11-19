import { countTo, mix, mixToken } from "../../../motion";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTokens } from "../../../videoTheme/useVideoTheme";
import css from "./demos.module.css";
import { formatReadout, useDemoColors } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "./helperDemo.types";
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
      readouts={[
        {
          name: "window",
          value: `${RAMP_AT}f to ${formatReadout(RAMP_AT + motion.sheet, 0)}f`,
        },
        { name: "progress", value: formatReadout(progress) },
        { name: "x", value: `${formatReadout(x, 1)}px` },
      ]}
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

const SWATCH_STEPS = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];

/** Cues of the mix token preview: the chip turns on, then off again. */
const MIX_CUES = { on: 15, off: 50 };

/**
 * A chip turning on and off through `mixToken()` rather than snapping,
 * between the theme's scene border and brand.
 */
export function MixTokenDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const scene = useVideoTokens().color.scene;
  const scales = useVideoShapeScales();
  const { highlight } = useDemoColors();
  const easing = motion.reveal.easing;
  const t =
    motion.ramp(frame, MIX_CUES.on, motion.chip, easing) *
    (1 - motion.ramp(frame, MIX_CUES.off, motion.chip, easing));
  const color = mixToken(t, scene.border, scene.brand);
  const stroke = useVideoTokens().stroke.default;
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="mixToken(t, scene.border, scene.brand)"
      readouts={[
        { name: "t", value: formatReadout(t) },
        { name: "css", value: color },
      ]}
    >
      <div className={css.centered}>
        <div className={css.cardColumn}>
          <div className={css.chip} style={{ borderColor: color, color }}>
            Selected
          </div>
          <div className={css.swatchStrip}>
            {SWATCH_STEPS.map((step) => {
              return (
                <span
                  key={step}
                  className={css.swatch}
                  style={{
                    background: mixToken(step, scene.border, scene.brand),
                    outline:
                      Math.abs(step - t) < 0.05
                        ? `${scales.stroke(stroke)}px solid ${highlight}`
                        : undefined,
                  }}
                />
              );
            })}
          </div>
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
  const value = countTo(
    frame,
    COUNT_AT,
    COUNT_TARGET,
    motion.scale(COUNT_FRAMES),
  );
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`countTo(frame, ${COUNT_AT}, ${COUNT_TARGET}, ${COUNT_FRAMES})`}
      readouts={[
        { name: "value", value: String(value) },
        { name: "progress", value: formatReadout(value / COUNT_TARGET) },
      ]}
    >
      <div className={css.centered}>
        <span className={css.bigNumber}>{value.toLocaleString("en")}</span>
      </div>
    </HelperDemoFrame>
  );
}
