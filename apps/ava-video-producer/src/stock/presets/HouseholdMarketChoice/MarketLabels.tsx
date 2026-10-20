import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import { STOCK } from "../../stockPalette";
import type { Input } from "./HouseholdMarketChoice.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Shelf and role labels leave a clear physical selection corridor. */
export function MarketLabels({ input }: Readonly<Props>): ReactNode {
  const labels: Array<[string, number, number, number, FitTextSize]> = [
    [input.scenarioCaption, 40, 36, 880, 16],
    [input.labels.shopper, 40, 340, 230, 14],
    [input.labels.retailer, 710, 340, 210, 14],
  ];
  return (
    <g>
      {labels.map(([text, x, y, width, fontSize], index) => (
        <FitText
          key={index}
          text={text}
          x={x}
          y={y}
          width={width}
          fontSize={fontSize}
          maxLines={3}
          normalizeWhitespace
          breakLongWords
        />
      ))}
      {input.products.map((product, index) => (
        <g key={product.id}>
          <FitText
            text={product.label}
            x={42 + index * 176}
            y={128}
            width={156}
            fontSize={14}
            maxLines={4}
            normalizeWhitespace
            breakLongWords
          />
          <text
            x={120 + index * 176}
            y={216}
            textAnchor="middle"
            fill={STOCK.muted}
            fontSize={16}
          >
            {product.price}
          </text>
        </g>
      ))}
    </g>
  );
}
