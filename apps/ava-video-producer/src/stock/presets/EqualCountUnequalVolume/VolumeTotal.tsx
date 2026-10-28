import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { getByteLabelFromBytes } from "./getByteLabelFromBytes";
import type { Input } from "./EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  group: Input["groups"][number];
  frame: number;
  y: number;
};
/** Exact collection sum shown in the authored common display unit. */
export function VolumeTotal({
  input,
  group,
  frame,
  y,
}: Readonly<Props>): ReactNode {
  const total = group.items.reduce((sum, item) => sum + item.bytes, 0);
  return frame >= 111 ? (
    <g opacity={ramp(frame, 111, 34)} data-total-bytes={total}>
      <LabelSlots
        labels={[
          [input.copy.total, 55, y + 178, 370, 12, 1],
          [
            getByteLabelFromBytes({
              bytes: total,
              displayUnit: input.measure.displayUnit,
            }),
            440,
            y + 178,
            460,
            12,
            1,
          ],
        ]}
      />
    </g>
  ) : null;
}
