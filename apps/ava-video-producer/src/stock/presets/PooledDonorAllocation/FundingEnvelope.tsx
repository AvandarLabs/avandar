import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PooledDonorAllocation.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  index: number;
  frame: number;
  accent: string;
  allocatedCredits: number;
};
/** Funding-request envelope stays below every contributed identity mark. */
export function FundingEnvelope({
  input,
  index,
  frame,
  accent,
  allocatedCredits,
}: Readonly<Props>): ReactNode {
  const request = input.requests[index];
  const width = 880 / input.requests.length;
  const x = 40 + index * width;
  const offset =
    input.envelopeArrangement === "fan"
      ? Math.abs(index - (input.requests.length - 1) / 2) * 12
      : 0;
  const top = 425 + offset;
  return (
    <g>
      <path
        data-envelope={request.id}
        data-edge={top}
        d={`M${x} ${top + 12 * (1 - ramp(frame, 118, 14))} H${x + width - 18} V${top + 42} H${x} Z M${x} ${top} L${x + width / 2 - 9} ${top + 28} L${x + width - 18} ${top}`}
        fill={STOCK.surface}
        stroke={accent}
      />
      <text x={x + 12} y={top + 27} fill={STOCK.orange} fontSize={14}>
        {index + 1}
      </text>
      <FitText
        text={request.label}
        x={x + 12}
        y={497}
        width={width - 42}
        fontSize={12}
        maxLines={3}
        normalizeWhitespace
        breakLongWords
      />
      {input.showAllocationTotals ? (
        <text
          data-allocation-total={request.id}
          x={x + width - 36}
          y={top + 27}
          textAnchor="end"
          fill={accent}
          fontSize={14}
        >
          {allocatedCredits}
        </text>
      ) : undefined}
    </g>
  );
}
