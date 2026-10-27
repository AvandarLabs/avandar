import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { getByteLabelFromBytes } from "./getByteLabelFromBytes";
import type { Input } from "./EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";
type Props = {
  item: Input["groups"][number]["items"][number];
  input: Input;
  x: number;
  y: number;
};
/** Full authored item labels and optional rounded byte display. */
export function ByteItemLabels({
  item,
  input,
  x,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots labels={[[item.label, x + 10, y - 1, 220, 12, 2]]} />
      {input.showItemSizes ? (
        <LabelSlots
          labels={[
            [
              getByteLabelFromBytes({
                bytes: item.bytes,
                displayUnit: input.measure.displayUnit,
              }),
              x + 225,
              y,
              130,
              12,
              2,
            ],
          ]}
        />
      ) : null}
    </g>
  );
}
