import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../LateTypeEvidence.schema";
import type { ReactNode } from "react";

type ParentProps = {
  input: Input;
  index: number;
  frame: number;
};

type Props = {
  input: Readonly<ParentProps>["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  value: Readonly<ParentProps>["input"]["values"][number];
  isLate: boolean;
  arrival: number;
  y: number;
};

/** Renders the evidence source cell source value in authored paint order. */
export function EvidenceSourceCellSourceValue(
  options: Readonly<Props>,
): ReactNode {
  return (
    <g
      data-source-value={options.value}
      data-original-value={
        options.input.showOriginalStrings ? options.value : undefined
      }
      opacity={options.arrival}
    >
      <StockRect
        data-late-cell={options.isLate ? "" : undefined}
        x={64}
        y={options.y}
        width={330}
        height={42}
        fill="none"
        stroke={
          options.isLate
            ? options.tokens.color.highlight
            : options.tokens.color.line
        }
      />
      <LiteralDataText value={options.value} x={88} y={options.y + 26} />
    </g>
  );
}
