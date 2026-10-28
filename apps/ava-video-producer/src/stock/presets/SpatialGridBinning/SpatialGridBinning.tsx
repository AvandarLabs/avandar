import { Text } from "../../graphics-common";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GridCells } from "./GridCells";
import { GridTokens } from "./GridTokens";
import { ZeroCountLegend } from "./ZeroCountLegend";
import type { GraphicProps } from "../../graphics-common";
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
      <Text x={870} y={485} size={20} anchor="end">
        {input.points.length}
      </Text>
      {input.points.map((point, index) => (
        <g key={point.id}>
          <Text
            x={40 + (index % 4) * 220}
            y={534 + Math.floor(index / 4) * 28}
            size={12}
          >
            {index + 1}·
          </Text>
          <LabelSlots
            labels={[
              [
                point.id,
                68 + (index % 4) * 220,
                534 + Math.floor(index / 4) * 28,
                180,
                12,
                1,
              ],
            ]}
          />
        </g>
      ))}
    </g>
  );
}
