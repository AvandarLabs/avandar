import { DrawPath } from "../../graphics-common/DrawPath";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { DecisionCondition } from "./DecisionCondition";
import { DecisionGate } from "./DecisionGate";
import { DecisionOutcome } from "./DecisionOutcome";
import type { DecisionForkInput } from "./DecisionFork.schema";
import type { ReactNode } from "react";

/** Shared branch context for private decision geometry components. */
export type Props = {
  branch: DecisionForkInput["branches"][number];
  x: number;
  frame: number;
  index: number;
  accent: string;
  isSelected: boolean;
  showUnchosenOutcomes: boolean;
};

/** One labeled alternative closes its gate unless it is the authored choice. */
export function DecisionBranch({
  branch,
  x,
  frame,
  index,
  accent,
  isSelected,
  ...remainingProps
}: Readonly<Props>): ReactNode {
  const style = useGraphicProps("DecisionFork", {});
  const { color } = useGraphicTokens();
  return (
    <g data-branch={branch.id} data-selected={isSelected}>
      <DrawPath
        d={`M480 235 C480 280 ${x} 280 ${x} 408`}
        frame={frame}
        at={18 + index * 2}
        color={color.line}
      />
      {isSelected ? (
        <DrawPath
          d={`M480 235 C480 280 ${x} 280 ${x} 408`}
          frame={frame}
          at={74}
          duration={40}
          color={accent}
          width={style.selectedWidth}
        />
      ) : null}
      <DecisionCondition
        {...{ ...remainingProps, branch, x, frame, index, accent, isSelected }}
      />
      <DecisionGate
        {...{ ...remainingProps, branch, x, frame, index, accent, isSelected }}
      />
      <DecisionOutcome
        {...{ ...remainingProps, branch, x, frame, index, accent, isSelected }}
      />
    </g>
  );
}
