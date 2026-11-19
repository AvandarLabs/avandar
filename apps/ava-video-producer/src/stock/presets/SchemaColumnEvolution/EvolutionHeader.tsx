import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./SchemaColumnEvolution.schema";
import type { ReactNode } from "react";

type Props = { input: Input; x: number; expansion: number; accent: string };
/** The additional header opens from the retained field's seam. */
export function EvolutionHeader({
  input,
  x,
  expansion,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <StockRect
        data-original-header=""
        x={x}
        y={145}
        width={520}
        height={65}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <StockRect
        data-added-header=""
        x={x + 520}
        y={145}
        width={260 * expansion}
        height={65}
        fill={accent}
        fillOpacity={scales.wash(tokens.alpha.wash)}
        stroke={accent}
      />
      <LabelSlots
        labels={[[input.fields.existingLabel, x + 310, 162, 195, 12, 3]]}
      />
      <g opacity={expansion}>
        <LabelSlots
          labels={[[input.fields.addedLabel, x + 535, 162, 230, 12, 3]]}
        />
      </g>
    </g>
  );
}
