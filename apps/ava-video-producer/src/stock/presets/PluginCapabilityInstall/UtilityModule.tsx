import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./PluginCapabilityInstall.schema";
import type { ReactNode } from "react";

type Props = { input: Input; y: number; accent: string };
/** A single named count utility with a fixed operation. */
export function UtilityModule({
  input,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      {" "}
      <StockRect
        data-utility-body=""
        x={508}
        y={y}
        width={379}
        height={100}
        rx={scales.corner(tokens.corner.label)}
        fill={tokens.color.surface}
        stroke={accent}
      />
      <LabelSlots
        labels={[
          [input.utility.label, 522, y + 22, 350, 14, 3],
          [input.utility.operationLabel, 522, y + 76, 350, 12, 2],
        ]}
      />
    </g>
  );
}
