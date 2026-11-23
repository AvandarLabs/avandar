import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RefinementMotion } from "../RefinementMotion";
import { ChartCategoryContent } from "./ChartCategoryContent";
import type { Input } from "../ChartFocusEdit.schema";
import type { ReactNode } from "react";

type Props = {
  category: Input["categories"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};

/**
 * An unchanging quantitative bar with independently moving editorial labels.
 */
export function ChartCategory({
  category,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const refinement = RefinementMotion.getRefinementFromFrame({ frame, motion });
  const direct = input.treatment !== "focus" ? refinement : 0;
  const emphasized =
    input.treatment !== "direct-labels" && category.id !== input.focusId;
  const y = 174 + index * 72;
  return (
    <ChartCategoryContent
      category={category}
      index={index}
      input={input}
      frame={frame}
      accent={accent}
      atomic={atomic}
      tokens={tokens}
      scales={scales}
      motion={motion}
      refinement={refinement}
      direct={direct}
      emphasized={emphasized}
      y={y}
    />
  );
}
