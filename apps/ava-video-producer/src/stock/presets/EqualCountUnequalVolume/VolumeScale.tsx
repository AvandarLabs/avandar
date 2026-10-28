import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getByteLabelFromBytes } from "./getByteLabelFromBytes";
import type { Input } from "./EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  group: Input["groups"][number];
  y: number;
  accent: string;
};
/** Identical byte ruler and optional persistent count guide. */
export function VolumeScale({
  input,
  group,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <path
        d={`M440 ${y + 27} V${y + 160} H900`}
        stroke={STOCK.line}
        fill="none"
      />
      <LabelSlots
        labels={[
          [`0 ${input.measure.displayUnit}`, 440, y + 19, 120, 12, 1],
          [
            getByteLabelFromBytes({
              bytes: input.measure.scaleMaximumBytes,
              displayUnit: input.measure.displayUnit,
            }),
            790,
            y + 19,
            110,
            12,
            1,
          ],
        ]}
      />
      {input.showCountGuides ? (
        <path
          data-count-guide={group.id}
          d={`M420 ${y + 45} v${group.items.length * 39}`}
          stroke={accent}
          strokeDasharray="3 5"
        />
      ) : null}
    </g>
  );
}
