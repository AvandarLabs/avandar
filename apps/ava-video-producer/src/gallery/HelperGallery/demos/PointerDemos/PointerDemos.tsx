import clsx from "clsx";
import { Cursor } from "../../../../chrome/Cursor/Cursor";
import { useCursorMotion } from "../../../../chrome/useCursorMotion";
import { CursorMotionHelpers } from "../../../../CursorMotionHelpers";
import { mixToken } from "../../../../motion";
import { SketchedShape } from "../../../../stock/primitives/SketchedShape";
import { useVideoMotion } from "../../../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../../../videoTheme/useVideoShapeScales";
import {
  useVideoTheme,
  useVideoTokens,
} from "../../../../videoTheme/useVideoTheme";
import css from "../demos.module.css";
import { DemoTheme } from "../DemoTheme";
import { HelperDemoFrame } from "../HelperDemoFrame/HelperDemoFrame";
import { ShutterInset } from "./ShutterInset";
import type {
  CursorKey,
  CursorMotion,
  CursorTarget,
} from "../../../../CursorMotionHelpers";
import type { VideoMotion } from "../../../../videoTheme/createVideoMotion/createVideoMotion";
import type { HelperDemoProps } from "../helperDemo.types";
import type { DemoReadout } from "../HelperDemoFrame/HelperDemoFrame";
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
    const point = CursorMotionHelpers.trackPos({
      frame,
      keys: PATH,
      motion: cursorMotion,
    });
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
  const colors = DemoTheme.useDemoColors();
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
  const position = CursorMotionHelpers.trackPos({
    frame,
    keys: PATH,
    motion: useCursorMotion(),
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={
        "CursorMotionHelpers.trackPos({ frame, keys })  <Cursor frame path clicks />"
      }
      readouts={[
        {
          name: "x",
          value: DemoTheme.formatReadout({ value: position.x, digits: 1 }),
        },
        {
          name: "y",
          value: DemoTheme.formatReadout({ value: position.y, digits: 1 }),
        },
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
  const shape = CursorMotionHelpers.cursorOnTarget({
    frame,
    path: PATH,
    targets: TARGETS,
    motion: useCursorMotion(),
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={"CursorMotionHelpers.cursorOnTarget({ frame, path, targets })"}
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
export function ClickFeedbackDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const cursorMotion = useCursorMotion();
  const brand = useVideoTokens().color.scene.brand;
  const { accent } = DemoTheme.useDemoColors();
  const isDown = CursorMotionHelpers.downAt(frame, PRESS_CLICKS);
  const fill = mixToken(Number(isDown), brand, accent);
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={`CursorMotionHelpers.downAt(frame, [${PRESS_CLICKS.join(", ")}])  CursorMotionHelpers.cursorScale({ frame, clicks })`}
      readouts={_getClickReadouts({ isDown, frame, cursorMotion })}
    >
      <div
        className={clsx(css.button, css.absolute, css.pressTarget)}
        style={{
          background: fill,
          transform: `scale(${Math.min(
            ...PRESS_CLICKS.map((at) => {
              return motion.press(frame, at);
            }),
          )})`,
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
/** A fast pointer with its trailing shutter samples drawn enlarged. */
export function CursorShutterDemo({
  frame,
  frames,
}: HelperDemoProps): ReactNode {
  const motion = useVideoMotion();
  const samples = CursorMotionHelpers.cursorShutter({
    frame,
    path: FAST_PATH,
    motion: useCursorMotion(),
  });
  return (
    <HelperDemoFrame
      frame={frame}
      frames={frames}
      label={"CursorMotionHelpers.cursorShutter({ frame, path })"}
      readouts={samples.map((sample, index) => {
        return {
          name: `sample ${index}`,
          value: `${DemoTheme.formatReadout({
            value: Math.hypot(sample.x, sample.y),
            digits: 1,
          })}px · ${sample.opacity}`,
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

/** Formats the live readouts displayed by ClickFeedbackDemo. */
function _getClickReadouts({
  isDown,
  frame,
  cursorMotion,
}: Readonly<{
  isDown: boolean;
  frame: number;
  cursorMotion: ReturnType<typeof useCursorMotion>;
}>): DemoReadout[] {
  return [
    { name: "downAt", value: String(isDown) },
    {
      name: "cursorScale",
      value: DemoTheme.formatReadout({
        value: CursorMotionHelpers.cursorScale({
          frame,
          clicks: PRESS_CLICKS,
          motion: cursorMotion,
        }),
        digits: 3,
      }),
    },
  ];
}
