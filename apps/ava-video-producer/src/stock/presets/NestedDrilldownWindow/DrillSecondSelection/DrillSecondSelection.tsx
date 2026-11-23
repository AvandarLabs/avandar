import { FitText } from "../../../primitives/FitText/FitText";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SelectedSubgroupWindow } from "./SelectedSubgroupWindow";
import type { Input } from "../NestedDrilldownWindow.schema";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
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
      <SelectedSubgroupWindow
        input={input}
        progress={progress}
        groups={groups}
        accent={accent}
        tokens={tokens}
        scales={scales}
        x={x}
      />
    </g>
  );
}
