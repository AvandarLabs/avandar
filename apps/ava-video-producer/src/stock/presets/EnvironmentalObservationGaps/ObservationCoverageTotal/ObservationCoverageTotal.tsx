import { FitText } from "../../../primitives/FitText/FitText";
import { ObservationCoverageLabel } from "../ObservationCoverageLabel/ObservationCoverageLabel";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";

type Props = {
  role: Array<
    | { role: string; label: Input["copy"]["observed"]; value: number }
    | { role: string; label: Input["copy"]["missing"]; value: number }
  >[number]["role"];
  label: Array<
    | { role: string; label: Input["copy"]["observed"]; value: number }
    | { role: string; label: Input["copy"]["missing"]; value: number }
  >[number]["label"];
  index: number;
  value: Array<
    | { role: string; label: Input["copy"]["observed"]; value: number }
    | { role: string; label: Input["copy"]["missing"]; value: number }
  >[number]["value"];
  input: Input;
};

/** Renders the string label role with authored geometry. */
export function ObservationCoverageTotal({
  role,
  label,
  index,
  value,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g key={role}>
      <ObservationCoverageLabel label={label} index={index} />
      <FitText
        text={String(value)}
        x={32 + index * 466}
        y={594}
        width={290}
        fontSize={12}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.copy.areaUnit}
        x={340 + index * 466}
        y={594}
        width={120}
        fontSize={12}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
