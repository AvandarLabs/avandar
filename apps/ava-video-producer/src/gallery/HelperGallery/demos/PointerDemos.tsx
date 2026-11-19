import clsx from "clsx";
import { Cursor } from "../../../chrome/Cursor";
import { useCursorMotion } from "../../../chrome/useCursorMotion";
import {
  cursorOnTarget,
  cursorScale,
  cursorShutter,
  downAt,
  trackPos,
} from "../../../cursor-motion";
import { mixToken } from "../../../motion";
import { SketchedShape } from "../../../stock/primitives/SketchedShape";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import {
  useVideoTheme,
  useVideoTokens,
} from "../../../videoTheme/useVideoTheme";
import css from "./demos.module.css";
import { formatReadout, useDemoColors } from "./demoTheme";
import { HelperDemoFrame } from "./HelperDemoFrame/HelperDemoFrame";
import type {
  CursorKey,
  CursorMotion,
  CursorTarget,
} from "../../../cursor-motion";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { HelperDemoProps } from "./helperDemo.types";
import type { ReactNode } from "react";

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

/** Frames of the route the faint trail samples. */
const TRAIL_FRAMES = 105;

/** The whole route, sampled once a frame, as an SVG path. */
function _buildTrailPath(cursorMotion: CursorMotion): string {
  const points = Array.from({ length: TRAIL_FRAMES }, (_, frame) => {
    const point = trackPos(frame, PATH, cursorMotion);
    return `${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  });
  return `M${points.join(" L")}`;
}

/** The field and button the pointer travels between. */
function Targets({ frame }: { frame: number }) {
  const theme = useVideoTheme();
  const { stroke, sketch } = theme.semantic;
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const colors = useDemoColors();
  const cursorMotion = useCursorMotion();
  return (
    <>
      <svg className={css.layer} aria-hidden="true">
        <SketchedShape
          shape={{ kind: "path", d: _buildTrailPath(cursorMotion) }}
          profile={sketch.shape}
          fill="none"
          stroke={colors.line}
          strokeDasharray={theme.atomic.dash.spaced.join(" ")}
          strokeWidth={scales.stroke(stroke.default)}
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
          transform: `scale(${motion.press(frame, CLICKS[1])})`,
        }}
      >
        Publish
      </div>
    </>
  );
}

/** A pointer travelling between measured targets with arrival holds. */
export function TrackPosDemo({ frame, frames }: HelperDemoProps): ReactNode {
  const position = trackPos(frame, PATH, useCursorMotion());
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
export function CursorOnTargetDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const shape = cursorOnTarget(frame, PATH, TARGETS, useCursorMotion());
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

/** The deepest press of any click in progress on this frame. */
function _getPressScale(frame: number, motion: VideoMotion): number {
  return Math.min(
    ...PRESS_CLICKS.map((at) => {
      return motion.press(frame, at);
    }),
  );
}

/** A button held down while `downAt()` is true, the pointer dipping with it. */
export function ClickFeedbackDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const cursorMotion = useCursorMotion();
  const brand = useVideoTokens().color.scene.brand;
  const { accent } = useDemoColors();
  const isDown = downAt(frame, PRESS_CLICKS);
  const fill = mixToken(Number(isDown), brand, accent);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`downAt(frame, [${PRESS_CLICKS.join(", ")}])  cursorScale(frame, clicks)`}
      readouts={[
        { name: "downAt", value: String(isDown) },
        {
          name: "cursorScale",
          value: formatReadout(
            cursorScale(frame, PRESS_CLICKS, cursorMotion),
            3,
          ),
        },
      ]}
    >
      <div
        className={clsx(css.button, css.absolute, css.pressTarget)}
        style={{
          background: fill,
          transform: `scale(${_getPressScale(frame, motion)})`,
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
/** The shutter samples relative to the pointer, enlarged. */
function ShutterInset({
  samples,
}: {
  samples: ReturnType<typeof cursorShutter>;
}) {
  const { atomic } = useVideoTheme();
  return (
    <div className={css.inset}>
      {samples.map((sample, index) => {
        return (
          <span
            key={SAMPLE_NAMES[index]}
            className={css.insetSample}
            style={{
              transform: `translate(${(sample.x * INSET_SCALE).toFixed(1)}px, ${(sample.y * INSET_SCALE).toFixed(1)}px)`,
              opacity: sample.opacity > 0 ? atomic.opacity["60"] : 0,
            }}
          />
        );
      })}
      <span className={css.insetCenter} />
      <span className={css.insetLabel}>{`× ${INSET_SCALE}`}</span>
    </div>
  );
}

/** A fast pointer with its trailing shutter samples drawn enlarged. */
export function CursorShutterDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const samples = cursorShutter(frame, FAST_PATH, useCursorMotion());
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label="cursorShutter(frame, path)"
      readouts={samples.map((sample, index) => {
        return {
          name: `sample ${index}`,
          value: `${formatReadout(Math.hypot(sample.x, sample.y), 1)}px · ${sample.opacity}`,
        };
      })}
    >
      <ShutterInset samples={samples} />
      <Cursor frame={frame} path={FAST_PATH} />
      <span
        className={css.footnote}
        style={{
          opacity: motion.ramp(frame, 0, motion.chip, motion.reveal.easing),
        }}
      >
        Inset: shutter samples relative to the pointer, enlarged
      </span>
    </HelperDemoFrame>
  );
}
