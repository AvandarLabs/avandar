import { FitText } from "../../../primitives/FitText/FitText";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../RetailShelfReplenishment.schema";
import type { ReactNode } from "react";

type ParentProps = { input: Input; shelfQuantities: number[] };

type Props = {
  input: Readonly<ParentProps>["input"];
  shelfQuantities: Readonly<ParentProps>["shelfQuantities"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  good: Readonly<ParentProps>["input"]["goods"][number];
  index: number;
};

/** Renders the good quantity label in authored paint order. */
export function GoodQuantityLabel(options: Readonly<Props>): ReactNode {
  return (
    <g key={options.good.id}>
      <FitText
        text={options.good.label}
        x={42}
        y={170 + options.index * 105}
        width={108}
        fontSize={12}
        maxLines={5}
        breakLongWords
        normalizeWhitespace
      />
      {options.input.showQuantityLabels ? (
        <text
          data-quantity={options.good.id}
          x={42}
          y={252 + options.index * 105}
          fontSize={options.tokens.text.graphic.secondary.fontSize}
          fontFamily={options.tokens.text.graphic.secondary.fontFamily}
          fontWeight={options.tokens.text.graphic.secondary.fontWeight}
          fill="currentColor"
        >
          {options.shelfQuantities[options.index]}
        </text>
      ) : undefined}
    </g>
  );
}
