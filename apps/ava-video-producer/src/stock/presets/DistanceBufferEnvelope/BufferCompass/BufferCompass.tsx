import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { BufferCompassShared } from "./BufferCompassShared/BufferCompassShared";
import { type Props } from "./BufferCompassShared/BufferCompassShared.types";
import { CompassArm } from "./CompassArm";
import type { ReactNode } from "react";

const BUFFER_FILL_ALPHA = 0.04;
/** The circle draws on as one normalised path length. */
const DRAW_ON_LENGTH = 1;
/** A center-anchored compass sweeps the exact supplied Euclidean radius. */
export function BufferCompass({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { color, stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const { sweep, radius, center, ruler, arm } =
    BufferCompassShared.getCompassGeometry({ input, frame, motion });
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
