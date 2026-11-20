import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

const RULER_AT = 13;
const RULER_FRAMES = 37;
const SWEEP_AT = 51;
const SWEEP_FRAMES = 54;
const ARM_FADE_AT = 106;
const BUFFER_FILL_ALPHA = 0.04;
/** The circle draws on as one normalised path length. */
const DRAW_ON_LENGTH = 1;

function _getCompassGeometry({
  input,
  frame,
  motion,
}: Readonly<Pick<Props, "input" | "frame"> & { motion: VideoMotion }>) {
  const sweep = motion.ramp(
    frame,
    SWEEP_AT,
    motion.scale(SWEEP_FRAMES),
    motion.travel.easing,
  );
  const x = 48 + input.origin.x * 3.6,
    y = 190 + input.origin.y * 3.6;
  const radius = input.radiusUnits * 3.6;
  const center = { cx: x, cy: y };
  const ruler = {
    x1: x,
    y1: y,
    x2: x + radius * motion.ramp(frame, RULER_AT, motion.scale(RULER_FRAMES)),
    y2: y,
  };
  const arm = {
    x1: x,
    y1: y,
    x2: x + Math.cos(sweep * Math.PI * 2) * radius,
    y2: y + Math.sin(sweep * Math.PI * 2) * radius,
  };
  return { sweep, radius, center, ruler, arm };
}
/** A center-anchored compass sweeps the exact supplied Euclidean radius. */
export function BufferCompass({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { color, stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const { sweep, radius, center, ruler, arm } = _getCompassGeometry({
    input,
    frame,
    motion,
  });
  const width = shapes.stroke(stroke.default);
  return (
    <g>
      <SketchedShape
        data-buffer-circle=""
        shape={{ kind: "circle", ...center, r: radius }}
        profile={sketch.shape}
        fill={accent}
        fillOpacity={shapes.wash(BUFFER_FILL_ALPHA) * sweep}
        stroke={accent}
        strokeWidth={width}
        pathLength={DRAW_ON_LENGTH}
        strokeDasharray={DRAW_ON_LENGTH}
        strokeDashoffset={DRAW_ON_LENGTH * (1 - sweep)}
      />
      <SketchedShape
        data-radius-ruler=""
        shape={{ kind: "line", ...ruler }}
        profile={sketch.shape}
        stroke={color.highlight}
        strokeWidth={width}
      />
      <CompassArm arm={arm} frame={frame} accent={accent} />
      <circle
        data-origin-position={`${input.origin.x},${input.origin.y}`}
        {...center}
        r={6}
        fill={color.highlight}
      />
    </g>
  );
}

/** The compass arm, shown while it sweeps and faded once the circle closes. */
function CompassArm({
  arm,
  frame,
  accent,
}: Readonly<{
  arm: ReturnType<typeof _getCompassGeometry>["arm"];
  frame: number;
  accent: string;
}>): ReactNode {
  const { stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  return (
    <SketchedShape
      data-compass-arm=""
      shape={{ kind: "line", ...arm }}
      profile={sketch.shape}
      stroke={accent}
      strokeWidth={shapes.stroke(stroke.default)}
      opacity={
        motion.ramp(frame, SWEEP_AT, motion.panel) *
        (1 - motion.ramp(frame, ARM_FADE_AT, motion.reveal.duration))
      }
    />
  );
}
