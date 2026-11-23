import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { makeCoordinateTriageFromInputAndFrame } from "../makeCoordinateTriageFromInputAndFrame";
import { PlottedRowAssociation } from "../PlottedRowAssociation";
import { TriageTokensShared } from "./TriageTokensShared";
import type { ReactNode } from "react";

type Props = {
  row: ReturnType<typeof makeCoordinateTriageFromInputAndFrame>["rows"][number];
  frame: number;
  accent: string;
};

/** A plotted row's association to its point, and the point itself. */
export function PlottedRow({ row, frame, accent }: Readonly<Props>): ReactNode {
  const { stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g>
      <PlottedRowAssociation row={row} frame={frame} accent={accent} />
      <SketchedShape
        data-plotted-point={row.id}
        shape={{ kind: "circle", cx: row.targetX, cy: row.targetY, r: 5 }}
        profile={sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={shapes.stroke(stroke.hairline)}
        opacity={motion.ramp(
          frame,
          TriageTokensShared.POINT_AT +
            row.index * TriageTokensShared.POINT_STEP,
          motion.scale(TriageTokensShared.POINT_FRAMES),
        )}
      />
    </g>
  );
}
