import { StockRect } from "../../primitives/StockRect";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./WorkDecomposition.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

/**
 * The tint of the whole piece before it splits, before the theme's tint
 * strength.
 */
const WHOLE_TINT = 0.16;

/** Renders the original work slab in authored paint order. */
export function OriginalWorkSlab(options: Readonly<Props>): ReactNode {
  return (
    <StockRect
      data-original-slab="true"
      x={90}
      y={230}
      width={500}
      height={270}
      fill={options.accent}
      fillOpacity={
        options.scales.wash(WHOLE_TINT) *
        (1 - options.motion.ramp(options.frame, 38, options.motion.scale(2)))
      }
      stroke={options.accent}
      strokeOpacity={options.tokens.alpha.ghost}
    />
  );
}
