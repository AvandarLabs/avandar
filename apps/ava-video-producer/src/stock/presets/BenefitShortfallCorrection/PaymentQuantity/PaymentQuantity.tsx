import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { QuantityTotal } from "./QuantityTotal";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
        strokeDasharray={index === 3 ? atomic.dash.dense.join(" ") : undefined}
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
      {showTotals ? <QuantityTotal index={index} total={total} /> : undefined}
    </g>
  );
}
