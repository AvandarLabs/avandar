import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
/** Inputs for AquiferOwnershipKey. */
type Props = { number: number; x: number; y: number };

/** A stable visible number connects a physical route to its budget entry. */
export function AquiferOwnershipKey({
  number,
  x,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <circle
        data-ownership-key={number}
        cx={x}
        cy={y}
        r={10}
        fill={STOCK.ground}
        stroke={STOCK.muted}
        strokeWidth={1}
      />
      <FitText
        text={String(number)}
        x={x}
        y={y + 4}
        width={18}
        fontSize={12}
        maxLines={1}
        anchor="middle"
        normalizeWhitespace
      />
    </>
  );
}
