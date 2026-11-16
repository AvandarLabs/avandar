import { clsx } from "clsx";
import { Cursor } from "../../../chrome/Cursor";
import {
  cursorOnTarget,
  cursorScale,
  cursorShutter,
  downAt,
  trackPos,
} from "../../../cursor-motion";
import { mixToken, press, ramp } from "../../../motion";
import css from "./demos.module.css";
import { DEMO_COLORS, formatReadout } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type { CursorKey, CursorTarget } from "../../../cursor-motion";
import type { HelperDemoProps } from "./helperDemo.types";

/** Field and button centres on the preview stage. */
const FIELD = { x: 230, y: 120 };
const BUTTON = { x: 640, y: 320 };
const CLICKS = [32, 84];

/** Arrive, hold through each click plus 8 frames, then move on. */
const PATH: CursorKey[] = [
  { at: 0, x: 80, y: 400 },
  { at: 22, x: FIELD.x, y: FIELD.y },
  { at: CLICKS[0] + 18, x: FIELD.x, y: FIELD.y },
  { at: 74, x: BUTTON.x, y: BUTTON.y },
  { at: CLICKS[1] + 20, x: BUTTON.x, y: BUTTON.y },
];
const TARGETS: CursorTarget[] = [
  { frame: CLICKS[0], ...FIELD, cursor: "text" },
  { frame: CLICKS[1], ...BUTTON, cursor: "pointer" },
];

/** The whole route, sampled once a frame, for a faint trail. */
const TRAIL = Array.from({ length: 105 }, (_, frame) => trackPos(frame, PATH))
  .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
  .join(" ");

/** The field and button the pointer travels between. */
function Targets({ frame }: { frame: number }) {
  return (
    <>
      <svg className={css.layer} aria-hidden="true">
        <polyline
          points={TRAIL}
          fill="none"
          stroke={DEMO_COLORS.line}
          strokeDasharray="4 6"
          strokeWidth={2}
        />
      </svg>
      <div
        className={css.field}
        style={{ left: FIELD.x - 140, top: FIELD.y - 26 }}
      />
      <div
        className={clsx(css.button, css.absolute)}
        style={{
          left: BUTTON.x - 110,
          top: BUTTON.y - 32,
          transform: `scale(${press(frame, CLICKS[1])})`,
        }}
      >
        Publish
      </div>
    </>
  );
}

/** A pointer travelling between measured targets with arrival holds. */
export function TrackPosDemo({ frame, frames }: HelperDemoProps) {
  const position = trackPos(frame, PATH);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="trackPos(frame, keys)  <Cursor frame path clicks />"
      readouts={[
        { name: "x", value: formatReadout(position.x, 1) },
        { name: "y", value: formatReadout(position.y, 1) },
        { name: "clicks", value: CLICKS.join(", ") },
      ]}
    >
      <Targets frame={frame} />
      <Cursor frame={frame} path={PATH} clicks={CLICKS} />
    </HelperDemoFrame>
  );
}

/** The pointer taking the I-beam and hand shapes only on arrival. */
export function CursorOnTargetDemo({ frame, frames }: HelperDemoProps) {
  const shape = cursorOnTarget(frame, PATH, TARGETS);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="cursorOnTarget(frame, path, targets)"
      readouts={[{ name: "cursor", value: shape }]}
    >
      <Targets frame={frame} />
      <Cursor frame={frame} path={PATH} clicks={CLICKS} cursor={shape} />
    </HelperDemoFrame>
  );
}

const PRESS_PATH: CursorKey[] = [
  { at: 0, x: 300, y: 380 },
  { at: 20, x: 452, y: 232 },
  { at: 89, x: 452, y: 232 },
];
const PRESS_CLICKS = [35, 62];

/** A button held down while `downAt()` is true, the pointer dipping with it. */
export function ClickFeedbackDemo({ frame, frames }: HelperDemoProps) {
  const isDown = downAt(frame, PRESS_CLICKS);
  const fill = mixToken(Number(isDown), "var(--brand)", "var(--demo-accent)");
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`downAt(frame, [${PRESS_CLICKS.join(", ")}])  cursorScale(frame, clicks)`}
      readouts={[
        { name: "downAt", value: String(isDown) },
        {
          name: "cursorScale",
          value: formatReadout(cursorScale(frame, PRESS_CLICKS), 3),
        },
      ]}
    >
      <div
        className={clsx(css.button, css.absolute, css.pressTarget)}
        style={{
          background: fill,
          transform: `scale(${Math.min(...PRESS_CLICKS.map((at) => press(frame, at)))})`,
        }}
      >
        Run query
      </div>
      <Cursor
        frame={frame}
        path={PRESS_PATH}
        clicks={PRESS_CLICKS}
        cursor={frame >= 20 ? "pointer" : "default"}
      />
    </HelperDemoFrame>
  );
}

const FAST_PATH: CursorKey[] = [
  { at: 0, x: 140, y: 340 },
  { at: 20, x: 140, y: 340 },
  { at: 30, x: 700, y: 120 },
  { at: 55, x: 700, y: 120 },
  { at: 65, x: 140, y: 340 },
];
/** Stable names of the three shutter samples, oldest first. */
const SAMPLE_NAMES = ["far", "middle", "near"] as const;
/** How much the shutter samples are enlarged in the inset. */
const INSET_SCALE = 12;

/** A fast pointer with its trailing shutter samples drawn enlarged. */
export function CursorShutterDemo({ frame, frames }: HelperDemoProps) {
  const samples = cursorShutter(frame, FAST_PATH);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="cursorShutter(frame, path)"
      readouts={samples.map((sample, index) => ({
        name: `sample ${index}`,
        value: `${formatReadout(Math.hypot(sample.x, sample.y), 1)}px · ${sample.opacity}`,
      }))}
    >
      <div className={css.inset}>
        {samples.map((sample, index) => (
          <span
            key={SAMPLE_NAMES[index]}
            className={css.insetSample}
            style={{
              transform: `translate(${(sample.x * INSET_SCALE).toFixed(1)}px, ${(sample.y * INSET_SCALE).toFixed(1)}px)`,
              opacity: sample.opacity > 0 ? 0.6 : 0,
            }}
          />
        ))}
        <span className={css.insetCenter} />
        <span className={css.insetLabel}>{`× ${INSET_SCALE}`}</span>
      </div>
      <Cursor frame={frame} path={FAST_PATH} />
      <span className={css.footnote} style={{ opacity: ramp(frame, 0, 6) }}>
        Inset: shutter samples relative to the pointer, enlarged
      </span>
    </HelperDemoFrame>
  );
}
