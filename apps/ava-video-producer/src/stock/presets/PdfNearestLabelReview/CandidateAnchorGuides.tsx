import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicMotion, useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { getCandidateFromFrame, getMeasureFromFrame } from "./reviewTiming";
import type { Input } from "./PdfNearestLabelReview.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number };

/** The dashes of the first and second candidates' callouts. */
const SECOND_CALLOUT_DASH = "7 4";
/** Uniform page units retain the original Euclidean distance anchors. */
export function CandidateAnchorGuides({
  input,
  index,
  frame,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const label = input.labels[index];
  const figureX = 100 + input.figure.x * 3,
    figureY = 170 + input.figure.y * 3;
  const distance = getMeasureFromFrame(frame, motion);
  const x = 100 + label.x * 3,
    y = 170 + label.y * 3;
  const color = index === 0 ? tokens.color.accentAlt : tokens.color.highlight;
  return (
    <g opacity={getCandidateFromFrame(frame, index, motion)}>
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
          strokeDasharray={index === 0 ? undefined : atomic.dash.tight.join(" ")}
        />
      </g>
      <g data-label-anchor={label.id}>
        <SketchedShape
          shape={{ kind: "circle", cx: x, cy: y, r: 6 + index * 4 }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={color}
        />
      </g>
      <g data-label-callout={label.id}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x} ${y} H${478 + index * 14} V${225 + index * 95} H540`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={color}
          strokeOpacity={tokens.alpha.guide}
          strokeDasharray={
            index === 0 ? atomic.dash.dotted.join(" ") : SECOND_CALLOUT_DASH
          }
        />
      </g>
    </g>
  );
}
