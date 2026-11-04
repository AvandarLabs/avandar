import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { VolumeShelf } from "./VolumeShelf";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./EqualCountUnequalVolume.schema";
import type { ReactNode } from "react";
/** Two equal-cardinality collections and one byte measurement scale. */
export type Props = GraphicProps & { input: Input };
/**
 * Retained count marks reveal unequal byte quantities without changing grain.
 */
export function EqualCountUnequalVolume({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const grain = stockI18n._({
    id: `motionAtlas.equal-count-unequal-volume.controls.itemKind.${input.itemKind}`,
    message: input.itemKind,
  });
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.count, 55, 45, 375, 14, 2],
          [input.copy.size, 440, 45, 460, 14, 1],
          [grain, 55, 80, 375, 12, 1],
          [input.measure.basisLabel, 55, 106, 840, 14, 1],
          [input.copy.proxyNote, 55, 548, 840, 14, 1],
          [input.copy.example, 55, 578, 840, 12, 1],
        ]}
      />
      {input.groups.map((group, index) => (
        <VolumeShelf
          key={group.id}
          group={group}
          input={input}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
    </g>
  );
}
