import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; difference: number; y: number };
/** Prediction Difference for the authored scene. */
export function PredictionDifference({
  input,
  frame,
  difference,
  y,
}: Readonly<Props>): ReactNode {
  return input.showDistanceDifferences && frame >= 108 ? (
    <g aria-label={`↔ ${difference} ${input.track.unit}`}>
      <path
        d={`M192 ${y + 26} H204 M195 ${y + 23} L192 ${y + 26} L195 ${y + 29} M201 ${y + 23} L204 ${y + 26} L201 ${y + 29}`}
        stroke={STOCK.orange}
        fill="none"
      />
      <FitText
        text={`${difference} ${input.track.unit}`}
        x={210}
        y={y + 30}
        width={196}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  ) : undefined;
}
