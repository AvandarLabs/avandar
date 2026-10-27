import { propEq } from "@avandar/utils";
import { DUR, ramp } from "../../../motion";
import { DrawPath, STOCK, Text } from "../../graphics-common";
import { DecisionBranch } from "./DecisionBranch";
import { DecisionHeading } from "./DecisionHeading";
import { DecisionMarker } from "./DecisionMarker";
import type { GraphicProps } from "../../graphics-common";
import type { DecisionForkInput } from "./DecisionFork.schema";
import type { ReactNode } from "react";

/** Frame-controlled authored choice preserves the established input type. */
export type Props = GraphicProps & { input: DecisionForkInput };

/**
 * A bounded authored decision shows conditions, closed gates and one outcome.
 */
export function DecisionFork({ frame, accent, input }: Props): ReactNode {
  const branchSpacing = 880 / input.branches.length;
  const selectedIndex = input.branches.findIndex(
    propEq("id", input.selectedBranchId),
  );
  const selectedX = 40 + branchSpacing * (selectedIndex + 0.5);
  return (
    <g>
      <DecisionHeading frame={frame} input={input} />
      <DrawPath d="M480 174 L480 235" frame={frame} at={16} color={accent} />
      {input.branches.map((branch, index) => (
        <DecisionBranch
          key={branch.id}
          branch={branch}
          x={40 + branchSpacing * (index + 0.5)}
          frame={frame}
          index={index}
          accent={accent}
          isSelected={branch.id === input.selectedBranchId}
          showUnchosenOutcomes={input.showUnchosenOutcomes}
        />
      ))}
      <DecisionMarker
        frame={frame}
        x={selectedX}
        accent={accent}
        branchId={input.selectedBranchId}
      />
      <g opacity={ramp(frame, 120, DUR.chip)}>
        <Text x={480} y={557} size={16} anchor="middle" fill={STOCK.muted}>
          {input.selectionLabel}
        </Text>
      </g>
    </g>
  );
}
