import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { label: string };
/** The zero caption names a legend sample, including when no cell is empty. */
export function ZeroCountLegend({ label }: Readonly<Props>): ReactNode {
  return (
    <g data-zero-legend="observed">
      <LabelSlots labels={[[label, 496, 130, 420, 12, 2]]} />
      <rect
        data-zero-sample="observed"
        x={450}
        y={118}
        width={32}
        height={34}
        fill="none"
        stroke={STOCK.line}
      />
      <text
        data-zero-value={0}
        x={466}
        y={141}
        fontFamily="Arial, sans-serif"
        fontSize={16}
        textAnchor="middle"
        fill={STOCK.text}
      >
        0
      </text>
    </g>
  );
}
