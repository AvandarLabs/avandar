import {
  DUR,
  enter,
  enterAt,
  leave,
  mix,
  pop,
  press,
  ramp,
} from "../../../motion";
import css from "./demos.module.css";
import { formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import { CurvePlot } from "./parts/CurvePlot";
import { DemoCard } from "./parts/DemoCard";
import type { HelperDemoProps } from "./helperDemo.types";

const ENTER_AT = 12;
/** Three ways to call `enter()`, side by side. */
const ENTER_VARIANTS = [
  { code: "enter(frame, 12)", options: {} },
  { code: "{ x: 16, y: 0 }", options: { x: 16, y: 0 } },
  { code: "{ scale: 0.94 }", options: { scale: 0.94 } },
] as const;

/** `enter()` with its default rise, a sideways arrival and a small scale. */
export function EnterDemo({ frame, frames }: HelperDemoProps) {
  const style = enter(frame, ENTER_AT);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`enter(frame, ${ENTER_AT}, options)`}
      readouts={[
        { name: "opacity", value: formatReadout(Number(style.opacity)) },
        { name: "transform", value: String(style.transform) },
      ]}
    >
      <div className={css.centered}>
        <div className={css.cards}>
          {ENTER_VARIANTS.map((variant) => (
            <div key={variant.code} className={css.cardColumn}>
              <DemoCard
                title="Saved view"
                style={enter(frame, ENTER_AT, variant.options)}
              />
              <span className={css.caption}>{variant.code}</span>
            </div>
          ))}
        </div>
      </div>
    </HelperDemoFrame>
  );
}

const ROWS = ["first", "second", "third", "fourth", "fifth", "sixth"];

/** `enterAt()` walking a list in, `STAGGER` frames apart. */
export function EnterAtDemo({ frame, frames }: HelperDemoProps) {
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="enterAt(frame, 12, index)"
      readouts={ROWS.slice(0, 3).map((row, index) => ({
        name: `row ${index}`,
        value: formatReadout(Number(enterAt(frame, 12, index).opacity)),
      }))}
    >
      <div className={css.list}>
        {ROWS.map((row, index) => (
          <div
            key={row}
            className={css.listRow}
            style={enterAt(frame, 12, index)}
          >
            <span className={css.listDot} />
            <span className={css.listBar} style={{ width: 120 + index * 30 }} />
          </div>
        ))}
      </div>
    </HelperDemoFrame>
  );
}

const LEAVE_AT = 48;

/** A card entering, then `leave()` reversing the same rise. */
export function LeaveDemo({ frame, frames }: HelperDemoProps) {
  const style = frame < LEAVE_AT ? enter(frame, 6) : leave(frame, LEAVE_AT);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`leave(frame, ${LEAVE_AT})`}
      readouts={[
        { name: "opacity", value: formatReadout(Number(style.opacity)) },
        { name: "transform", value: String(style.transform) },
      ]}
    >
      <div className={css.centered}>
        <DemoCard title="Draft" style={style} />
      </div>
    </HelperDemoFrame>
  );
}

const POP_AT = 15;

/** A card landing on a spring, beside the spring's own curve. */
export function PopDemo({ frame, frames }: HelperDemoProps) {
  const landing = pop(frame, POP_AT);
  const time = Math.min(1, Math.max(0, (frame - POP_AT) / DUR.sheet));
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`pop(frame, ${POP_AT})  damping 14 · stiffness 120 · mass 0.8`}
      readouts={[
        { name: "pop", value: formatReadout(landing) },
        { name: "y", value: `${formatReadout(mix(landing, -80, 0), 1)}px` },
      ]}
    >
      <div className={css.split}>
        <div className={css.plotCell}>
          <CurvePlot
            easing={(value) => pop(value * DUR.sheet, 0)}
            t={time}
            size={300}
          />
        </div>
        <div className={css.centered}>
          <DemoCard
            title="Export ready"
            style={{
              opacity: ramp(frame, POP_AT, DUR.chip),
              transform: `translateY(${mix(landing, -80, 0).toFixed(2)}px)`,
            }}
          />
        </div>
      </div>
    </HelperDemoFrame>
  );
}

const PRESSES = [20, 50];

/** A button answering two presses with `press()` and returning to exactly 1. */
export function PressDemo({ frame, frames }: HelperDemoProps) {
  const scale = Math.min(...PRESSES.map((at) => press(frame, at)));
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`press(frame, at)  at = ${PRESSES.join(", ")}`}
      readouts={[{ name: "scale", value: formatReadout(scale, 3) }]}
    >
      <div className={css.centered}>
        <div className={css.button} style={{ transform: `scale(${scale})` }}>
          Publish
        </div>
      </div>
    </HelperDemoFrame>
  );
}
