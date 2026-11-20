import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getCandidateFromFrame, MEASURE_CUE, STATUS_CUE } from "./reviewTiming";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const label = input.labels[index];
  const y = 185 + index * 95;
  const color = index === 0 ? tokens.color.accentAlt : tokens.color.highlight;
  return (
    <g
      opacity={getCandidateFromFrame(frame, index, motion)}
      data-candidate-label={label.id}
    >
      <StockRect
        x={540}
        y={y}
        width={360}
        height={92}
        rx={scales.corner(tokens.corner.chip)}
        fill={tokens.color.elevated}
        stroke={color}
      />
      <LabelSlots
        labels={[
          [String(index + 1), 550, y + 24, 22, 14, 1],
          [label.text, 582, y + 24, 306, 16, 2],
        ]}
      />
      {input.showDistanceValues ? (
        <DistanceValue
          labelId={label.id}
          distance={distance}
          y={y}
          frame={frame}
        />
      ) : undefined}
    </g>
  );
}

/** The measured distance, shown while the measure holds. */
function DistanceValue({
  labelId,
  distance,
  y,
  frame,
}: Readonly<{
  labelId: string;
  distance: number;
  y: number;
  frame: number;
}>): ReactNode {
  const motion = useGraphicMotion();
  return (
    <g
      data-distance-value={labelId}
      opacity={ramp(
        frame,
        MEASURE_CUE,
        STATUS_CUE - MEASURE_CUE,
        motion.reveal.easing,
      )}
    >
      <LiteralDataText
        value={`≈ ${distance.toPrecision(3)}`}
        x={582}
        y={y + 78}
      />
    </g>
  );
}
