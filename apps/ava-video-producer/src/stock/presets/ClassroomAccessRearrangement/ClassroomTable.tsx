import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { hasTable: boolean; progress: number; accent: string };
/** Classroom Table for the authored scene. */
export function ClassroomTable({
  hasTable,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g
      data-shared-table={hasTable}
      transform={`translate(380 370) rotate(${hasTable ? mix(progress, -12, 0) : -12})`}
    >
      <StockRect
        x={-95}
        y={-35}
        width={190}
        height={70}
        rx={scales.corner(tokens.corner.panel)}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: "M-32 -10 L-14 16 L-50 16 Z M12 -12 H38 V14 H12 Z",
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.positive}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </g>
  );
}
