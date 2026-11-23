import { Text } from "../../graphics-common/Text";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SpatialGridBinning.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & { input: Input };

type Props = {
  point: Readonly<ParentProps>["input"]["points"][number];
  index: number;
};

/** Renders the binned point identity in authored paint order. */
export function BinnedPointIdentity(options: Readonly<Props>): ReactNode {
  return (
    <g key={options.point.id}>
      <Text
        x={40 + (options.index % 4) * 220}
        y={534 + Math.floor(options.index / 4) * 28}
        role="data"
      >
        {options.index + 1}·
      </Text>
      <LabelSlots
        labels={[
          [
            options.point.id,
            68 + (options.index % 4) * 220,
            534 + Math.floor(options.index / 4) * 28,
            180,
            12,
            1,
          ],
        ]}
      />
    </g>
  );
}
