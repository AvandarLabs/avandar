import { clsx } from "clsx";
import { useCursorMotion } from "../../../../../chrome/useCursorMotion";
import { CursorMotionHelpers } from "../../../../../CursorMotionHelpers";
import { SketchedShape } from "../../../../../stock/primitives/SketchedShape";
import { useVideoMotion } from "../../../../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../../../videoTheme/videoThemeHelpers";
import { DemoTheme } from "../../DemoTheme";
import css from "./Targets.module.css";
import type {
  CursorKey,
  CursorMotion,
} from "../../../../../CursorMotionHelpers";
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

/** Renders Targets for live helper catalog previews. */
export function Targets({ frame }: Readonly<Props>): ReactNode {
  const theme = useVideoTheme();
  const { stroke, sketch } = theme.semantic;
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const colors = DemoTheme.useDemoColors();
  const cursorMotion = useCursorMotion();
  return (
    <>
      <svg className={css.targetsLayer} aria-hidden="true">
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
        className={css.targetsField}
        style={{ left: FIELD.x - 140, top: FIELD.y - 26 }}
      />
      <div
        className={clsx(css.targetsButton, css.targetsAbsolute)}
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

type Props = { frame: number };
