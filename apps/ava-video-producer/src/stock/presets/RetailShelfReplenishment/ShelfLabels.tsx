import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./RetailShelfReplenishment.schema";
import type { ReactNode } from "react";

type Props = { input: Input; shelfQuantities: number[] };
/** Fixed copy rails remain clear of all product and hand travel. */
export function ShelfLabels({
  input,
  shelfQuantities,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.goods.map((good, index) => (
        <g key={good.id}>
          <FitText
            text={good.label}
            x={42}
            y={170 + index * 105}
            width={108}
            fontSize={12}
            maxLines={5}
            breakLongWords
            normalizeWhitespace
          />
          {input.showQuantityLabels ? (
            <text
              data-quantity={good.id}
              x={42}
              y={252 + index * 105}
              fontSize={16}
              fill="currentColor"
            >
              {shelfQuantities[index]}
            </text>
          ) : undefined}
        </g>
      ))}
      <FitText
        text={input.labels.retailer}
        x={570}
        y={70}
        width={340}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.labels.shopper}
        x={570}
        y={520}
        width={340}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.labels.delivery}
        x={42}
        y={116}
        width={470}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.labels.unit}
        x={42}
        y={512}
        width={470}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.scenarioCaption}
        x={42}
        y={576}
        width={870}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
