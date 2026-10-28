import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./DistanceBufferEnvelope.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  location: Input["locations"][number];
  index: number;
};
/** The complete supplied set keeps independent visible source-order keys. */
export function BufferSourceRow({
  input,
  location,
  index,
}: Readonly<Props>): ReactNode {
  const distance = Math.hypot(
    location.x - input.origin.x,
    location.y - input.origin.y,
  );
  return (
    <g data-distance={distance}>
      <text x={440} y={282 + index * 48} fontSize={12} fill={STOCK.text}>
        {index + 1}
      </text>
      <LabelSlots
        labels={[[location.label, 466, 282 + index * 48, 140, 12, 3]]}
      />
      {input.showDistances ? (
        <text
          data-distance-label={location.id}
          x={670}
          y={282 + index * 48}
          fontSize={12}
          textAnchor="end"
          fill={STOCK.text}
        >
          {Number(distance.toPrecision(4))}
        </text>
      ) : undefined}
    </g>
  );
}
