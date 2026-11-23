import { DrawPath } from "../../graphics-common/DrawPath";
import { DecisionBranch } from "./DecisionBranch";
import { DecisionHeading } from "./DecisionHeading";
import { DecisionMarker } from "./DecisionMarker/DecisionMarker";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { DecisionForkInput } from "./DecisionFork.schema";
import type { ReactNode } from "react";

/** Frame-controlled authored choice preserves the established input type. */
export type ParentProps = GraphicProps & {
  input: DecisionForkInput;
};

type Props = {
  frame: ParentProps["frame"];
  accent: ParentProps["accent"];
  input: ParentProps["input"];
  branchSpacing: number;
  selectedX: number;
};

/** Renders the decision branches in authored paint order. */
export function DecisionBranches(options: Readonly<Props>): ReactNode {
  return (
    <>
      <DecisionHeading frame={options.frame} input={options.input} />
      <DrawPath
        d="M480 174 L480 235"
        frame={options.frame}
        at={16}
        color={options.accent}
      />
      {options.input.branches.map((branch, index) => {
        return (
          <DecisionBranch
            key={branch.id}
            branch={branch}
            x={40 + options.branchSpacing * (index + 0.5)}
            frame={options.frame}
            index={index}
            accent={options.accent}
            isSelected={branch.id === options.input.selectedBranchId}
            showUnchosenOutcomes={options.input.showUnchosenOutcomes}
          />
        );
      })}
      <DecisionMarker
        frame={options.frame}
        x={options.selectedX}
        accent={options.accent}
        branchId={options.input.selectedBranchId}
      />
    </>
  );
}
