import { mix } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ReviewTiming } from "../ReviewTiming";
import { LabelCallout } from "./LabelCallout";
import type { Input } from "../PdfNearestLabelReview.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number };
/** Uniform page units retain the original Euclidean distance anchors. */
export function CandidateAnchorGuides({
  input,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const label = input.labels[index];
  const figureX = 100 + input.figure.x * 3,
    figureY = 170 + input.figure.y * 3;
  const distance = ReviewTiming.getMeasureFromFrame({ frame, motion });
  const x = 100 + label.x * 3,
    y = 170 + label.y * 3;
  const color = index === 0 ? tokens.color.accentAlt : tokens.color.highlight;
  return (
    <g opacity={ReviewTiming.getCandidateFromFrame({ frame, index, motion })}>
      <g data-distance-guide={label.id}>
        <SketchedShape
          shape={{
            kind: "line",
            x1: figureX,
            y1: figureY,
            x2: mix(distance, figureX, x),
            y2: mix(distance, figureY, y),
          }}
          profile={tokens.sketch.shape}
          stroke={color}
          strokeWidth={scales.stroke(tokens.stroke.default)}
          strokeDasharray={
            index === 0 ? undefined : atomic.dash.tight.join(" ")
          }
        />
      </g>
      <LabelCallout
        labelId={label.id}
        x={x}
        y={y}
        index={index}
        color={color}
      />
    </g>
  );
}
