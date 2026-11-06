import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./CarbonStorageAccounting.schema";
import type { ReactNode } from "react";

type Props = { input: Input; retained: number; emissions: number };
/** Exact retained-minus-operating subtraction preserves every result sign. */
export function CarbonNetAccounting({
  input,
  retained,
  emissions,
}: Readonly<Props>): ReactNode {
  return (
    <g data-net={retained - emissions}>
      <FitText
        text={input.copy.net}
        x={540}
        y={446}
        width={380}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <path
        d="M535 490 V550 H925 V490"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={2}
      />
      {[retained, emissions, retained - emissions].map((value, index) => (
        <FitText
          key={index}
          text={String(value)}
          x={540 + index * 135}
          y={510}
          width={110}
          fontSize={12}
          maxLines={3}
          breakLongWords
          normalizeWhitespace
        />
      ))}
      <text x={658} y={515} fill={STOCK.text} fontSize={16}>
        −
      </text>
      <text x={793} y={515} fill={STOCK.text} fontSize={16}>
        =
      </text>
      <FitText
        text={input.copy.accountingUnit}
        x={540}
        y={568}
        width={380}
        fontSize={12}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
