import { STOCK } from "../../stockPalette";
import type { Input } from "./ProtectedWorkBoundary.schema";
import type { ReactNode } from "react";

type Props = {
  slot: Input["slots"][number];
  x: number;
  width: number;
  accent: string;
  id: string;
};
/** Fixed equal block shape retains a non-color cue for protected time. */
export function ProtectedSlotBody({
  slot,
  x,
  width,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      <rect
        data-slot-body={slot.id}
        x={x}
        y={210}
        width={width}
        height={300}
        fill={STOCK.surface}
        stroke={slot.kind === "work" ? STOCK.line : accent}
      />
      {slot.kind !== "work" ? (
        <rect
          x={x + 2}
          y={212}
          width={width - 4}
          height={296}
          fill={`url(#${id}-protected)`}
          opacity={0.2}
        />
      ) : undefined}
    </g>
  );
}
