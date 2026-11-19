import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicMotion, useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  row: ReturnType<typeof makeCoordinateTriageFromInputAndFrame>["rows"][number];
  frame: number;
  accent: string;
};

/** Coincident coordinates retain one visible connection to every source key. */
export function PlottedRowAssociation({
  row,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const { stroke, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const y = 132 + row.index * 69;
  return (
    <SketchedShape
      data-row-association={row.id}
      shape={{
        kind: "path",
        d: `M${row.targetX} ${row.targetY} L438 ${row.targetY} L438 ${y} L441 ${y}`,
      }}
      profile={sketch.shape}
      fill="none"
      stroke={accent}
      strokeOpacity={atomic.opacity["45"]}
      strokeWidth={shapes.stroke(stroke.hairline)}
      opacity={motion.ramp(frame, row.arrivedAt, motion.chip)}
    />
  );
}
