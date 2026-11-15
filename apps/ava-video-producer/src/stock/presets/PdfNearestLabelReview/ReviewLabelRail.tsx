import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; distance: number };
/**
 * Full candidate text stays clear of arbitrarily close or coincident anchors.
 */
export function ReviewLabelRail({
  input,
  index,
  frame,
  distance,
}: Readonly<Props>): ReactNode {
  const label = input.labels[index];
  const y = 185 + index * 95;
  const color = index === 0 ? STOCK.cyan : STOCK.orange;
  return (
    <g
      opacity={ramp(frame, 13 + index * 2, 35)}
      data-candidate-label={label.id}
    >
      <rect
        x={540}
        y={y}
        width={360}
        height={92}
        rx={4}
        fill={STOCK.elevated}
        stroke={color}
      />
      <LabelSlots
        labels={[
          [String(index + 1), 550, y + 24, 22, 14, 1],
          [label.text, 582, y + 24, 306, 16, 2],
        ]}
      />
      {input.showDistanceValues ? (
        <g data-distance-value={label.id} opacity={ramp(frame, 51, 44)}>
          <LiteralDataText
            value={`≈ ${distance.toPrecision(3)}`}
            x={582}
            y={y + 78}
          />
        </g>
      ) : undefined}
    </g>
  );
}
