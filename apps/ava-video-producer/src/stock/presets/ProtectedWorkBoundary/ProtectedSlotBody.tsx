import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  return (
    <g>
      {" "}
      <StockRect
        data-slot-body={slot.id}
        x={x}
        y={210}
        width={width}
        height={300}
        fill={tokens.color.surface}
        stroke={slot.kind === "work" ? tokens.color.line : accent}
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
