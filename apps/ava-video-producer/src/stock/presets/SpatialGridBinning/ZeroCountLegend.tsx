import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { label: string };

const ZERO_VALUE_SIZE = 16;
/** The zero caption names a legend sample, including when no cell is empty. */
export function ZeroCountLegend({ label }: Readonly<Props>): ReactNode {
  const { color, stroke, text } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  const body = text.graphic.body;
  return (
    <g data-zero-legend="observed">
      <LabelSlots labels={[[label, 496, 130, 420, 12, 2]]} />
      <StockRect
        data-zero-sample="observed"
        x={450}
        y={118}
        width={32}
        height={34}
        fill="none"
        stroke={color.line}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <text
        data-zero-value={0}
        x={466}
        y={141}
        fontFamily={body.fontFamily}
        fontSize={ZERO_VALUE_SIZE}
        textAnchor="middle"
        fill={body.color}
      >
        0
      </text>
    </g>
  );
}
