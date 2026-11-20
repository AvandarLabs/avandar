import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import { PlottedRowAssociation } from "./PlottedRowAssociation";
import { TriageRowToken } from "./TriageRowToken";
import type { Input } from "./CoordinateQualityTriage.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };

const POINT_AT = 51;
const POINT_STEP = 3;
const POINT_FRAMES = 39;
/**
 * Fixed plotted coordinates retain all source-key associations after arrival.
 */
export function TriageTokens({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = useGraphicMotion();
  const { rows } = makeCoordinateTriageFromInputAndFrame({
    input,
    frame,
    motion,
  });
  return (
    <g>
      {rows.map((row) => {
        return (
          <g key={row.id}>
            {row.reason === "plotted" ? (
              <PlottedRow row={row} frame={frame} accent={accent} />
            ) : undefined}
            <TriageRowToken row={row} frame={frame} accent={accent} />
          </g>
        );
      })}
    </g>
  );
}

/** A plotted row's association to its point, and the point itself. */
function PlottedRow({
  row,
  frame,
  accent,
}: Readonly<{
  row: ReturnType<typeof makeCoordinateTriageFromInputAndFrame>["rows"][number];
  frame: number;
  accent: string;
}>): ReactNode {
  const { stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  return (
    <g>
      <PlottedRowAssociation row={row} frame={frame} accent={accent} />
      <SketchedShape
        data-plotted-point={row.id}
        shape={{
          kind: "circle",
          cx: row.targetX,
          cy: row.targetY,
          r: 5,
        }}
        profile={sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={shapes.stroke(stroke.hairline)}
        opacity={motion.ramp(
          frame,
          POINT_AT + row.index * POINT_STEP,
          motion.scale(POINT_FRAMES),
        )}
      />
    </g>
  );
}
