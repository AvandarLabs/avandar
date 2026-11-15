import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/**
 * Captions distinguish complete sources, qualifying results and distance units.
 */
export function BufferHeadings({ input, accent }: Readonly<Props>): ReactNode {
  const numIncluded = input.locations.filter(
    (location) =>
      Math.hypot(location.x - input.origin.x, location.y - input.origin.y) <=
      input.radiusUnits,
  ).length;
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 40, 30, 880, 16, 2],
          [input.labels.qualifier, 40, 78, 880, 14, 2],
          [input.origin.label, 40, 128, 370, 12, 2],
          [input.copy.source, 448, 128, 230, 12, 4],
          [input.copy.result, 700, 128, 230, 12, 4],
          [`r = ${input.radiusUnits}`, 40, 170, 290, 12, 1],
          [input.labels.unit, 448, 200, 230, 12, 4],
          [input.labels.inside, 700, 200, 230, 12, 4],
          [input.labels.outside, 60, 580, 860, 12, 1],
        ]}
      />
      <circle cx={40} cy={576} r={5} fill={STOCK.orange} />
      <text
        data-buffer-count={`${numIncluded}/${input.locations.length}`}
        x={400}
        y={170}
        textAnchor="end"
        fontSize={12}
        fill={accent}
      >
        {numIncluded}/{input.locations.length}
      </text>
    </g>
  );
}
