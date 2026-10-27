import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import type { ReactNode } from "react";
type Props = {
  row: ReturnType<typeof makeCoordinateTriageFromInputAndFrame>["rows"][number];
  showValues: boolean;
};
/**
 * Fixed source identities reserve three lines for each escaped JSON literal.
 */
export function CoordinateRowSource({
  row,
  showValues,
}: Readonly<Props>): ReactNode {
  const y = 132 + row.index * 69;
  return (
    <g data-reason={row.reason}>
      <path d={`M475 ${y - 10} H920`} stroke={STOCK.line} />
      <circle cx={450} cy={y} r={9} fill={STOCK.surface} stroke={STOCK.muted} />
      <text
        data-row-key={row.id}
        aria-label={String(row.index + 1)}
        x={450}
        y={y + 4}
        fontFamily="Arial, sans-serif"
        fontSize={12}
        fill={STOCK.text}
        textAnchor="middle"
      >
        {row.index + 1}
      </text>
      {row.reason === "plotted" ? (
        <text
          data-plotted-key-reference={row.representativeIndex + 1}
          x={472}
          y={y + 4}
          fontFamily="Arial, sans-serif"
          fontSize={12}
          fill={STOCK.text}
        >{`→${row.representativeIndex + 1}`}</text>
      ) : undefined}
      <LabelSlots labels={[[row.id, 510, y + 4, 410, 12, 1]]} />
      {showValues ? (
        <g data-coordinate-value={row.id}>
          <LabelSlots
            labels={[
              [JSON.stringify(row.latitude), 480, y + 22, 210, 12, 3],
              [JSON.stringify(row.longitude), 710, y + 22, 210, 12, 3],
            ]}
          />
        </g>
      ) : undefined}
    </g>
  );
}
