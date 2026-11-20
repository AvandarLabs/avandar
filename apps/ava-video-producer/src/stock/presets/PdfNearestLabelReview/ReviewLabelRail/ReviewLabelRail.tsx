import { ramp } from "../../../../motion";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ReviewTiming } from "../ReviewTiming";
import { DistanceValue } from "./DistanceValue";
import type { Input } from "../PdfNearestLabelReview.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const label = input.labels[index];
  const y = 185 + index * 95;
  const color = index === 0 ? tokens.color.accentAlt : tokens.color.highlight;
  return (
    <g
      opacity={ReviewTiming.getCandidateFromFrame({ frame, index, motion })}
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
