import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../RecurringLeakPrevention.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  frame: number;
  accent: string;
};

type Props = {
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  intervention: number;
};

/** Renders the replacement seal in authored paint order. */
export function ReplacementSeal(options: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-replacement-seal="true"
      x={Motion.mix({
        t: options.intervention,
        from: 430,
        to: 471,
      })}
      y={238}
      width={18}
      height={44}
      rx={options.scales.corner(options.tokens.corner.chip)}
      stroke={options.accent}
      fill={options.tokens.color.surface}
      fillOpacity={options.tokens.alpha.ghost}
      strokeWidth={options.scales.stroke(options.tokens.stroke.emphasis)}
    />
  );
}
