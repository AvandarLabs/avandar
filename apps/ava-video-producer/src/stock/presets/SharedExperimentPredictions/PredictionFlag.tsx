import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";

type Props = {
  learner: Input["learners"][number];
  frame: number;
  index: number;
  flagX: number;
  y: number;
  accent: string;
};
/** Prediction Flag for the authored scene. */
export function PredictionFlag({
  learner,
  frame,
  index,
  flagX,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return frame >= 36 + index * 6 ? (
    <g
      data-prediction-id={learner.id}
      data-prediction-distance={learner.predictionDistance}
      transform={`translate(${flagX} ${y})`}
    >
      <SketchedShape
        shape={{ kind: "path", d: "M0 -24 V24" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M0 -24 H26 V-3 H0 Z" }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={accent}
      />
      <FitText
        text={String(index + 1)}
        x={13}
        y={-9}
        width={18}
        fontSize={12}
        maxLines={1}
        anchor="middle"
        normalizeWhitespace
      />
    </g>
  ) : undefined;
}
