import { mix, ramp, EASE } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import type { Input } from "./AquiferAllocationBalance.schema";
import type { ReactNode } from "react";
/** Inputs for AllocationPlanner. */
type Props = { frame: number; accent: string; input: Input };

/**
 * The planner takes hold of the approval control and sets the supplied amount.
 */
export function AllocationPlanner({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const reach = ramp(frame, 28, 8, EASE.inOut),
    set = ramp(frame, 36, 14, EASE.inOut);
  const share = input.flows.requestedWithdrawalM3
    ? input.flows.approvedWithdrawalM3 / input.flows.requestedWithdrawalM3
    : 0;
  const knobX = 220 + 100 * share * set,
    handX = mix(reach, 190, knobX);
  return (
    <g>
      <PersonGlyph
        x={180}
        y={181}
        size={34}
        role="worker"
        color={STOCK.orange}
      />
      <path d="M 220 185 H 320" stroke={STOCK.muted} strokeWidth={3} />
      <circle
        data-approval-knob="true"
        cx={knobX}
        cy={185}
        r={7}
        fill={accent}
      />
      <path
        d={`M 187 182 L ${handX} 185`}
        stroke={STOCK.orange}
        strokeWidth={2.5}
        fill="none"
      />
      <circle
        data-planner-hand="true"
        cx={handX}
        cy={185}
        r={3}
        fill={STOCK.orange}
      />
    </g>
  );
}
