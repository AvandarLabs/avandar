import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ArgumentBridge.schema";
import type { ReactNode } from "react";
/** Inputs for PremiseStrip. */
type Props = {
  premise: Input["premises"][number];
  x: number;
  center: number;
  slotWidth: number;
};

/** A fixed-size strip keeps the complete premise readable below the deck. */
export function PremiseStrip({
  premise,
  x,
  center,
  slotWidth,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <rect
        x={x + 4}
        y={410}
        width={slotWidth - 8}
        height={142}
        rx={8}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <FitText
        text={premise.text}
        x={center}
        y={446}
        width={slotWidth - 16}
        fontSize={14}
        maxLines={4}
        anchor="middle"
        breakLongWords
        normalizeWhitespace
      />
    </>
  );
}
