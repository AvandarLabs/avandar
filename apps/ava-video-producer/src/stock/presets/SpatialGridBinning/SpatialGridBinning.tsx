import { Text } from "../../graphics-common/Text";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { BinnedPointIdentity } from "./BinnedPointIdentity";
import { GridCells } from "./GridCells/GridCells";
import { GridTokens } from "./GridTokens/GridTokens";
import { ZeroCountLegend } from "./ZeroCountLegend";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SpatialGridBinning.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };

/** Exact point-to-cell counting with a source identity legend. */
export function SpatialGridBinning({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <LabelSlots
        labels={[
          [input.copy.context, 40, 34, 880, 16, 2],
          [input.copy.before, 40, 78, 400, 12, 3],
          [input.copy.after, 450, 78, 400, 12, 3],
          [input.labels.unit, 40, 130, 400, 12, 2],
          [input.labels.total, 450, 485, 400, 12, 3],
        ]}
      />
      <ZeroCountLegend label={input.labels.zero} />
      <GridCells input={input} frame={frame} accent={accent} />
      <GridTokens input={input} frame={frame} accent={accent} />
      <Text x={870} y={485} anchor="end">
        {input.points.length}
      </Text>
      {input.points.map((point, index) => {
        return (
          <BinnedPointIdentity key={point.id} point={point} index={index} />
        );
      })}
    </g>
  );
}
