import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ClusterEpicurveLink.schema";
import type { ReactNode } from "react";
/** Inputs for HistogramLabels. */
type Props = { input: Input };

/** Keyed chronological labels stay outside all bars and case-label rows. */
export function HistogramLabels({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.timeBins.map((bin, index) => (
        <g key={bin.id}>
          <text
            x={40 + (index % 3) * 195}
            y={385 + Math.floor(index / 3) * 48}
            fill={STOCK.muted}
            fontSize={12}
          >
            {index + 1}
          </text>
          <LabelSlots
            labels={[
              [
                bin.label,
                58 + (index % 3) * 195,
                385 + Math.floor(index / 3) * 48,
                175,
                12,
                3,
              ],
            ]}
          />
        </g>
      ))}
      <text x={620} y={84} fill={STOCK.muted} fontSize={12}>
        ?
      </text>
      <LabelSlots labels={[[input.copy.unknown, 640, 84, 290, 12, 4]]} />
    </g>
  );
}
