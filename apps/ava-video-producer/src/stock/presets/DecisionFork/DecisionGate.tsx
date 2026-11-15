import { DUR, mix, ramp } from "../../../motion";
import { STOCK } from "../../graphics-common";
import type { Props as BranchProps } from "./DecisionBranch";
import type { ReactNode } from "react";

type Props = Pick<BranchProps, "branch" | "x" | "frame" | "isSelected">;

/** Untaken alternatives close gently before the marker leaves the junction. */
export function DecisionGate({
  branch,
  x,
  frame,
  isSelected,
}: Readonly<Props>): ReactNode {
  const closed = isSelected ? 0 : ramp(frame, 60, DUR.sheet);
  return (
    <g
      opacity={closed}
      stroke={STOCK.muted}
      strokeWidth={2}
      data-closed-gate={branch.id}
    >
      <path
        d={`M${x - mix(closed, 0, 9)} 382 L${x + mix(closed, 0, 9)} 400 M${x + mix(closed, 0, 9)} 382 L${x - mix(closed, 0, 9)} 400`}
      />
    </g>
  );
}
