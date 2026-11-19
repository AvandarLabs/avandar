import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./ContactWindowOverlap.schema";
import type { ReactNode } from "react";

type Props = { record: Input["records"][number]; axisEnd: number; y: number };
/** Missing times receive a question mark, never an invented duration. */
export function RecordedInterval({
  record,
  axisEnd,
  y,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return record.start !== null && record.end !== null ? (
    <rect
      data-interval={record.id}
      x={280 + (630 * record.start) / axisEnd}
      y={y - 7}
      width={(630 * (record.end - record.start)) / axisEnd}
      height={14}
      rx={scales.corner(tokens.corner.chip)}
      fill={tokens.color.inactive}
      fillOpacity={scales.wash(atomic.opacity["35"])}
    />
  ) : (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M300 ${y - 5} q5 -7 10 0 q0 4 -5 5 M305 ${y + 4} v2`,
      }}
      profile={tokens.sketch.shape}
      data-unknown={record.id}
      stroke={tokens.color.highlight}
      fill="none"
    />
  );
}
