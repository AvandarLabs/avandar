import { ramp } from "../../../motion";
import { Text } from "../../graphics-common";
import { STOCK } from "../../stockPalette";
import type { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import type { ReactNode } from "react";
type Props = {
  row: ReturnType<typeof makeCoordinateTriageFromInputAndFrame>["rows"][number];
  frame: number;
  accent: string;
};
/** Coincident copies yield to the indexed representative and source keys. */
export function TriageRowToken({
  row,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const opacity =
    row.reason === "plotted" && row.representativeIndex !== row.index
      ? 1 - ramp(frame, 90 + row.index * 3, 6)
      : 1;
  return (
    <g data-moving-row-key={row.id} opacity={opacity}>
      <circle
        data-row-token={row.id}
        cx={row.x}
        cy={row.y}
        r={9}
        fill={STOCK.surface}
        stroke={row.reason === "plotted" ? accent : STOCK.orange}
      />
      <Text x={row.x} y={row.y + 4} size={12} anchor="middle">
        {row.index + 1}
      </Text>
    </g>
  );
}
