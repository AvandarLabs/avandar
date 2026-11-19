import { FitText } from "../../primitives/FitText/FitText";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ChartCategory } from "./ChartCategory";
import { ChartHeadings } from "./ChartHeadings";
import { ChartScale } from "./ChartScale";
import { getRefinementFromFrame } from "./getRefinementFromFrame";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const refinement = getRefinementFromFrame(frame, motion);
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
