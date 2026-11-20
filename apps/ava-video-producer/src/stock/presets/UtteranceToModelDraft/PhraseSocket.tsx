import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { role: string; label: string; accent: string };
/** The settled model has separate role and authored-label bands. */
export function PhraseSocket({
  role,
  label,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StockRect
        width={254}
        height={96}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        stroke={accent}
      />
      <LabelSlots
        labels={[
          [role, 12, 19, 230, 12, 2],
          [label, 12, 53, 230, 14, 3],
        ]}
      />
    </g>
  );
}
