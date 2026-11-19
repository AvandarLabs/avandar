import { mix } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { DrillSubgroupCompartments } from "./DrillSubgroupCompartments";
import { INSET_STROKE } from "./drillTiming";
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
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
      <StockRect
        x={mix(progress, x, 36)}
        y={294}
        width={mix(progress, 284, 888)}
        height={266}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(
          input.selectionStyle === "inset-frame"
            ? INSET_STROKE
            : tokens.stroke.default,
        )}
      />
    </g>
  );
}
