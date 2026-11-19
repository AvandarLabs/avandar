import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  label: string;
  index: number;
  total: number;
  showTotals: boolean;
  accent: string;
};
/** A pattern key names one independently counted payment quantity. */
export function PaymentQuantity({
  label,
  index,
  total,
  showTotals,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <StockRect
        x={48 + index * 224}
        y={187}
        width={18}
        height={18}
        fill={
          index === 1 ? accent : index === 2 ? tokens.color.accentAlt : "none"
        }
        stroke={index === 3 ? tokens.color.highlight : tokens.color.inactive}
        strokeDasharray={index === 3 ? "3 3" : undefined}
      />
      {index === 2 ? (
        <SketchedShape
          shape={{ kind: "path", d: `M${50 + index * 224} 202 l13 -12` }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.ground}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      ) : undefined}
      <LabelSlots labels={[[label, 76 + index * 224, 200, 192, 12, 3]]} />
      {showTotals ? (
        <text
          data-quantity-total={index}
          x={76 + index * 224}
          y={258}
          fill={tokens.color.text}
          fontSize={20}
        >
          {total}
        </text>
      ) : undefined}
    </g>
  );
}
