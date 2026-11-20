import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";

type Props = {
  learner: Input["learners"][number];
  frame: number;
  targetX: number;
  y: number;
  accent: string;
};
/** Prediction Drop for the authored scene. */
export function PredictionDrop({
  learner,
  frame,
  targetX,
  y,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return frame >= 66 ? (
    <g data-prediction-drop={learner.id}>
      <SketchedShape
        shape={{ kind: "path", d: `M${targetX} ${y + 24} V500` }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeOpacity={tokens.alpha.ghost}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
        strokeDasharray={tokens.dash.guide.join(" ")}
      />
    </g>
  ) : undefined;
}
