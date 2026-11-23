import { Motion } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { ByteItem } from "../ByteItem/ByteItem";
import { VolumeScale } from "../VolumeScale/VolumeScale";
import type { Input } from "../EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";

type ParentProps = {
  group: Input["groups"][number];
  input: Input;
  index: number;
  frame: number;
  accent: string;
};

type Props = {
  group: Readonly<ParentProps>["group"];
  input: Readonly<ParentProps>["input"];
  index: Readonly<ParentProps>["index"];
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  y: number;
  alignment: number;
};

/** Renders the volume group labels in authored paint order. */
export function VolumeGroupLabels(options: Readonly<Props>): ReactNode {
  return (
    <>
      <LabelSlots
        labels={[
          [options.group.label, 55, options.y, 375, 14, 2],
          [`${options.group.items.length}`, 25, options.y, 25, 16, 1],
        ]}
      />
      <VolumeScale
        {...{
          input: options.input,
          group: options.group,
          y: options.y,
          accent: options.accent,
        }}
      />
      {options.group.items.map((item, itemIndex) => {
        return (
          <ByteItem
            key={item.id}
            item={item}
            input={options.input}
            x={Motion.mix({
              t: options.alignment,
              from: 55 + options.index * 18,
              to: 55,
            })}
            y={options.y + 62 + itemIndex * 39}
            frame={options.frame}
            accent={options.accent}
          />
        );
      })}
    </>
  );
}
