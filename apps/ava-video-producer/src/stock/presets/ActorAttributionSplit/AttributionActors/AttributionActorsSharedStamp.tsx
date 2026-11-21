import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../../primitives/StockRect";
import { STAMP_CORNER } from "../attributionShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ActorAttributionSplit.schema";
import type { ReactNode } from "react";

type ParentProps = {
  frame: number;
  input: Input;
  accent: string;
};

type Props = {
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  separation: number;
  shared: Readonly<ParentProps>["input"]["accounts"][number];
};

/** Renders the attribution actors shared stamp in authored paint order. */
export function AttributionActorsSharedStamp(
  options: Readonly<Props>,
): ReactNode {
  return (
    <g
      data-shared-stamp="true"
      transform={`translate(300 ${Motion.mix({
        t: options.separation,
        from: 245,
        to: 490,
      })})`}
    >
      <StockRect
        width={215}
        height={60}
        rx={options.scales.corner(STAMP_CORNER)}
        fill={options.tokens.color.surface}
        stroke={options.tokens.color.inactive}
      />
      <LabelSlots labels={[[options.shared.label, 12, 22, 190, 12, 3]]} />
    </g>
  );
}
