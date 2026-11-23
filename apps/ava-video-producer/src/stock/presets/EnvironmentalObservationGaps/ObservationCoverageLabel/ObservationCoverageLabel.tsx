import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";

type Props = {
  label: Array<
    | { role: string; label: Input["copy"]["observed"]; value: number }
    | { role: string; label: Input["copy"]["missing"]; value: number }
  >[number]["label"];
  index: number;
};

/** Renders the label label label with authored geometry. */
export function ObservationCoverageLabel({
  label,
  index,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={label}
      x={32 + index * 466}
      y={546}
      width={428}
      fontSize={12}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
    />
  );
}
