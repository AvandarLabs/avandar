import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import {
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "../PredicatePushdownBoundary.schema";
import type { ReactNode } from "react";

type Props = Readonly<{ x: number; input: Input; accent: string }>;

/** The predicate's outlined badge: its metric, comparison, and unit. */
export function PredicateBadge({ x, input, accent }: Props): ReactNode {
  const style = useGraphicProps("PredicatePushdownBoundary", {});
  const scales = useGraphicShapeScales();
  const { color } = useGraphicTokens();
  return (
    <>
      <StockRect
        x={x - 8}
        y={92}
        width={364}
        height={82}
        rx={scales.corner(style.predicateRadius)}
        fill={color.elevated}
        stroke={accent}
        strokeWidth={scales.stroke(style.predicateStrokeWidth)}
      />
      <LabelSlots
        labels={[
          [input.metric.label, x, 109, 346, 12, 2],
          [
            `${input.predicate.operator} ${input.predicate.threshold}`,
            x,
            139,
            160,
            12,
            3,
          ],
          [input.metric.unit, x + 174, 139, 172, 12, 3],
        ]}
      />
    </>
  );
}
