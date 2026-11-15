import { DUR, countTo, mix, mixToken, ramp } from "../../../motion";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { HelperDemoProps } from "./helperDemo.types";

/** Where the ramp preview's window opens. */
const RAMP_AT = 15;
/** How far the ramp preview's block travels, in pixels. */
const RAMP_DISTANCE = 640;

/** `ramp()` producing clamped progress, and `mix()` turning it into pixels. */
export function RampDemo({ frame, frames }: HelperDemoProps) {
  const progress = ramp(frame, RAMP_AT, DUR.sheet);
  const x = mix(progress, 0, RAMP_DISTANCE);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`mix(ramp(frame, ${RAMP_AT}, DUR.sheet), 0, ${RAMP_DISTANCE})`}
      readouts={[
        { name: "window", value: `${RAMP_AT}f to ${RAMP_AT + DUR.sheet}f` },
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

/** A chip turning on and off through `mixToken()` rather than snapping. */
export function MixTokenDemo({ frame, frames }: HelperDemoProps) {
  const t = ramp(frame, 15, DUR.chip) * (1 - ramp(frame, 50, DUR.chip));
  const color = mixToken(t, "var(--border)", "var(--brand)");
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label='mixToken(t, "var(--border)", "var(--brand)")'
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
            {SWATCH_STEPS.map((step) => (
              <span
                key={step}
                className={css.swatch}
                style={{
                  background: mixToken(step, "var(--border)", "var(--brand)"),
                  outline:
                    Math.abs(step - t) < 0.05
                      ? "2px solid var(--demo-highlight)"
                      : undefined,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </HelperDemoFrame>
  );
}

const COUNT_TARGET = 1280;

/** A count rising to its final value instead of snapping to it. */
export function CountToDemo({ frame, frames }: HelperDemoProps) {
  const value = countTo(frame, 15, COUNT_TARGET, 30);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`countTo(frame, 15, ${COUNT_TARGET}, 30)`}
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
