import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./SchemaPlanLocalExecution.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * Local row occurrences and exact numeric values never cross the device edge.
 */
export function LocalRows({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g data-local-table="true">
      <LabelSlots
        labels={[
          [input.columns.category, 60, 312, 230, 16, 2],
          [input.columns.measure, 310, 312, 230, 16, 2],
        ]}
      />
      {input.rows.map((row, index) => {
        const selected = row.category === input.request.selectedCategory;
        const applied = motion.ramp(frame, 101 + index * 5, motion.whip);
        return (
          <g key={row.id} data-local-row={row.id}>
            <StockRect
              data-row-body={row.id}
              x={50}
              y={342 + index * 32}
              width={500}
              height={30}
              fill={selected && applied > 0 ? accent : tokens.color.surface}
              fillOpacity={selected ? 0.12 + applied * 0.12 : 1}
              stroke={selected && applied > 0 ? accent : tokens.color.line}
            />
            {input.showRows ? (
              <g>
                <LiteralDataText
                  value={row.category}
                  x={60}
                  y={363 + index * 32}
                />
                <g data-raw-value={row.value}>
                  <LiteralDataText
                    value={String(row.value)}
                    x={310}
                    y={363 + index * 32}
                  />
                </g>
              </g>
            ) : (
              <SketchedShape
                shape={{
                  kind: "path",
                  d: `M60 ${359 + index * 32} h130 M310 ${359 + index * 32} h70`,
                }}
                profile={tokens.sketch.shape}
                data-hidden-cells={row.id}
                stroke={tokens.color.inactive}
                strokeWidth={scales.stroke(tokens.stroke.heavy)}
              />
            )}
            {applied > 0 ? (
              <SketchedShape
                shape={{
                  kind: "path",
                  d: selected
                    ? `M520 ${359 + index * 32} l6 5 l12 -12`
                    : `M520 ${359 + index * 32} h15`,
                }}
                profile={tokens.sketch.shape}
                data-row-selected={selected ? row.id : undefined}
                stroke={selected ? accent : tokens.color.inactive}
                fill="none"
                strokeWidth={scales.stroke(tokens.stroke.default)}
              />
            ) : undefined}
          </g>
        );
      })}
    </g>
  );
}
