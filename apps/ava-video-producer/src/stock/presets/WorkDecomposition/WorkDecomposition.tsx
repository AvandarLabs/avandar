import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getWorkPartitionFromInput } from "./getWorkPartitionFromInput";
import { OriginalWorkSlab } from "./OriginalWorkSlab";
import { WorkCutLinesAndParentLabel } from "./WorkCutLinesAndParentLabel";
import { WorkGroupingLabel } from "./WorkGroupingLabel";
import { WorkSlabBrackets } from "./WorkSlabBrackets";
import { WorkUnitAndEffortLabels } from "./WorkUnitAndEffortLabels";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./WorkDecomposition.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & {
  input: Input;
};

/**
 * A conserved slab becomes proportionally weighted, externally labeled pieces.
 */
export function WorkDecomposition({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const separation = motion.ramp(frame, 86, motion.scale(38));
  const pieces = getWorkPartitionFromInput(input);
  const total = input.workItems.reduce((sum, item) => {
    return sum + item.effort;
  }, 0);
  return (
    <g opacity={motion.ramp(frame, 12, motion.scale(26))}>
      <OriginalWorkSlab
        frame={frame}
        accent={accent}
        tokens={tokens}
        scales={scales}
        motion={motion}
      />
      <WorkSlabBrackets
        frame={frame}
        input={input}
        accent={accent}
        tokens={tokens}
        motion={motion}
        pieces={pieces}
      />
      <WorkCutLinesAndParentLabel
        frame={frame}
        input={input}
        accent={accent}
        separation={separation}
        pieces={pieces}
      />
      <g opacity={separation}>
        <WorkGroupingLabel input={input} accent={accent} />
        <WorkUnitAndEffortLabels input={input} accent={accent} total={total} />
      </g>
    </g>
  );
}
