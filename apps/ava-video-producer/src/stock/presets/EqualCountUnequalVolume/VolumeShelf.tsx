import { mix, ramp, EASE } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { ByteItem } from "./ByteItem";
import { VolumeScale } from "./VolumeScale";
import { VolumeTotal } from "./VolumeTotal";
import type { Input } from "./EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";
type Props = {
  group: Input["groups"][number];
  input: Input;
  index: number;
  frame: number;
  accent: string;
};
/** A shelf preserves item ownership and uses the shared byte ruler. */
export function VolumeShelf({
  group,
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const y = 135 + index * 200;
  const alignment = ramp(frame, 12, 36, EASE.inOut);
  return (
    <g
      data-group-id={group.id}
      data-item-count={group.items.length}
      data-scale-bytes={input.measure.scaleMaximumBytes}
    >
      <LabelSlots
        labels={[
          [group.label, 55, y, 375, 14, 2],
          [`${group.items.length}`, 25, y, 25, 16, 1],
        ]}
      />
      <VolumeScale {...{ input, group, y, accent }} />
      {group.items.map((item, itemIndex) => (
        <ByteItem
          key={item.id}
          item={item}
          input={input}
          x={mix(alignment, 55 + index * 18, 55)}
          y={y + 62 + itemIndex * 39}
          frame={frame}
          accent={accent}
        />
      ))}
      <VolumeTotal {...{ input, group, frame, y }} />
    </g>
  );
}
