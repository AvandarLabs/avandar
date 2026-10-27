import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import { getOrderSlipPoseFromFrame } from "./getOrderSlipPoseFromFrame";
import type { Input } from "./RetailShelfReplenishment.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** The retailer places a visible authored request on the counter. */
export function ShelfOrder({ input, frame }: Readonly<Props>): ReactNode {
  const slip = getOrderSlipPoseFromFrame(frame);
  return (
    <g>
      {" "}
      <path d="M565 292 H670" stroke={STOCK.line} strokeWidth={4} />
      {input.showOrderSlip ? (
        <g data-order-slip transform={`translate(${slip.x} ${slip.y})`}>
          <rect
            width={72}
            height={24}
            fill={STOCK.surface}
            stroke={STOCK.orange}
          />
          <path d="M8 8 H60 M8 16 H45" stroke={STOCK.orange} />
        </g>
      ) : undefined}
      {input.showOrderSlip ? (
        <FitText
          text={input.labels.order}
          x={42}
          y={80}
          width={470}
          fontSize={14}
          maxLines={2}
          breakLongWords
          normalizeWhitespace
        />
      ) : undefined}
    </g>
  );
}
