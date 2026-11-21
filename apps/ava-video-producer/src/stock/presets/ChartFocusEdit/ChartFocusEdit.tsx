import { FitText } from "../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ChartCategory } from "./ChartCategory/ChartCategory";
import { ChartHeadings } from "./ChartHeadings";
import { ChartScale } from "./ChartScale/ChartScale";
import { RefinementMotion } from "./RefinementMotion";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ChartFocusEdit.schema";
import type { ReactNode } from "react";

/** Complete chart props. The shared renderer owns the loop envelope. */
export type Props = GraphicProps & { input: Input };

/** Refine an already complete chart while preserving its scale and values. */
export function ChartFocusEdit({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const refinement = RefinementMotion.getRefinementFromFrame({ frame, motion });
  return (
    <g data-axis-maximum={input.axisMaximum}>
      <ChartHeadings input={input} frame={frame} accent={accent} />
      <ChartScale axisMaximum={input.axisMaximum} refinement={refinement} />
      {input.categories.map((category, index) => {
        return (
          <ChartCategory
            key={category.id}
            category={category}
            index={index}
            input={input}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <FitText
        text={input.unitLabel}
        x={544}
        y={582}
        width={600}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
        anchor="middle"
        color={tokens.color.textMuted}
      />
    </g>
  );
}
