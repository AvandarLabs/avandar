import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { DrillSubgroupCompartments } from "./DrillSubgroupCompartments";
import type { Input } from "./NestedDrilldownWindow.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  progress: number;
  groups: string[];
  accent: string;
};
/**
 * The supplied subgroup opens into the detail window without an extra level.
 */
export function DrillSecondSelection({
  input,
  progress,
  groups,
  accent,
}: Readonly<Props>): ReactNode {
  const x = 44 + groups.indexOf(input.selectionPath[1]) * 292;
  return (
    <g data-second-selection={input.selectionPath[1]}>
      <FitText
        text={input.dimensions[1]}
        x={500}
        y={270}
        width={416}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
      <DrillSubgroupCompartments groups={groups} progress={progress} />
      <rect
        x={mix(progress, x, 36)}
        y={294}
        width={mix(progress, 284, 888)}
        height={266}
        fill="none"
        stroke={accent}
        strokeWidth={input.selectionStyle === "inset-frame" ? 5 : 2}
      />
    </g>
  );
}
