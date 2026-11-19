import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  learner: Input["learners"][number];
  frame: number;
  targetX: number;
  y: number;
};
/** Distance Bracket for the authored scene. */
export function DistanceBracket({
  input,
  learner,
  frame,
  targetX,
  y,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return input.showDistanceDifferences && frame >= 108 ? (
    <g data-distance-bracket={learner.id}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${targetX} ${y + 32} V${y + 38} H${450 + (430 * input.observationDistance) / input.track.maximum} V${y + 32}`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(tokens.stroke.outline)}
      />
    </g>
  ) : undefined;
}
