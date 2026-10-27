import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./SharedExperimentPredictions.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Track Labels for the authored scene. */
export function TrackLabels({ input }: Readonly<Props>): ReactNode {
  return (
    <g data-track-labels="true">
      <FitText
        text={input.labels.origin}
        x={405}
        y={532}
        width={250}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={`0 / ${input.track.maximum} ${input.track.unit}`}
        x={680}
        y={546}
        width={240}
        fontSize={12}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
