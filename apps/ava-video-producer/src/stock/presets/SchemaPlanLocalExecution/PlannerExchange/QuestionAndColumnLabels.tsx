import { FitText } from "../../../primitives/FitText/FitText";
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
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
};

/** Renders the question and column labels in authored paint order. */
export function QuestionAndColumnLabels(options: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        width={280}
        height={186}
        rx={options.scales.corner(options.tokens.corner.cell)}
        fill={options.tokens.color.elevated}
        stroke={options.tokens.color.highlight}
      />
      <FitText
        text={options.input.request.question}
        x={12}
        y={22}
        width={256}
        fontSize={14}
        maxLines={5}
        normalizeWhitespace
        breakLongWords
      />
      <LabelSlots
        labels={[
          [options.input.columns.category, 12, 120, 122, 14, 4],
          [options.input.columns.measure, 146, 120, 122, 14, 4],
        ]}
      />
    </>
  );
}
