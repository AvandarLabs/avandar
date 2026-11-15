import { AllocationPlanner } from "./AllocationPlanner";
import { AquiferBudget } from "./AquiferBudget";
import { AquiferCaptions } from "./AquiferCaptions";
import { AquiferCutaway } from "./AquiferCutaway";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./AquiferAllocationBalance.schema";
import type { ReactNode } from "react";
/** Inputs for AquiferAllocationBalance. */
type Props = GraphicProps & { input: Input };

/**
 * The supplied allocation changes a bounded store while unallocated demand
 * stays hollow.
 */
export function AquiferAllocationBalance({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <AquiferCaptions input={input} />
      <AllocationPlanner frame={frame} accent={accent} input={input} />
      <AquiferCutaway frame={frame} accent={accent} input={input} />
      <AquiferBudget input={input} />
    </g>
  );
}
