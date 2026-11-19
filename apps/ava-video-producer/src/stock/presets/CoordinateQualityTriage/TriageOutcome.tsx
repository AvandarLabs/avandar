import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./CoordinateQualityTriage.schema";
import type { makeCoordinateTriageFromInputAndFrame } from "./makeCoordinateTriageFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  outcome: ReturnType<
    typeof makeCoordinateTriageFromInputAndFrame
  >["counts"][number];
  index: number;
  labels: Input["labels"];
};
/** A tray owns its reason caption, key space and reconciled count. */
export function TriageOutcome({
  outcome,
  index,
  labels,
}: Readonly<Props>): ReactNode {
  const { color, stroke, corner, text } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  return (
    <g>
      {index ? (
        <StockRect
          data-tray-body={outcome.reason}
          x={40 + (index - 1) * 135}
          y={425}
          width={120}
          height={68}
          rx={shapes.corner(corner.cell)}
          fill="none"
          stroke={color.line}
          strokeWidth={shapes.stroke(stroke.hairline)}
        />
      ) : undefined}
      <text
        data-outcome-count={outcome.count}
        x={index ? 145 + (index - 1) * 135 : 370}
        y={index ? 422 : 132}
        fontSize={text.graphic.body.fontSize}
        fontWeight={text.graphic.body.fontWeight}
        fill={text.graphic.body.color}
        textAnchor="end"
      >
        {outcome.count}
      </text>
      {index ? (
        <LabelSlots
          labels={[
            [labels[outcome.reason], 40 + (index - 1) * 135, 516, 120, 12, 6],
          ]}
        />
      ) : undefined}
    </g>
  );
}
