import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../SchemaPlanLocalExecution.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  inboundX: number;
};

/** Renders the planner exchange inbound in authored paint order. */
export function PlannerExchangeInbound(options: Readonly<Props>): ReactNode {
  return (
    <g
      data-inbound="true"
      opacity={options.frame >= 56 ? 1 : 0}
      transform={`translate(${options.inboundX} 108)`}
    >
      <StockRect
        width={280}
        height={90}
        rx={options.scales.corner(6)}
        fill={options.tokens.color.surface}
        stroke={options.accent}
      />
      <LabelSlots
        labels={[[options.input.request.planLabel, 12, 22, 256, 16, 4]]}
      />
    </g>
  );
}
