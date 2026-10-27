import { STOCK } from "../../stockPalette";
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
  return input.showDistanceDifferences && frame >= 108 ? (
    <path
      data-distance-bracket={learner.id}
      d={`M${targetX} ${y + 32} V${y + 38} H${450 + (430 * input.observationDistance) / input.track.maximum} V${y + 32}`}
      fill="none"
      stroke={STOCK.orange}
      strokeWidth={1.5}
    />
  ) : undefined;
}
