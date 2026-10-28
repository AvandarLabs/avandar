import { ConsentSlip } from "./ConsentSlip";
import { ConsentTurningHand } from "./ConsentTurningHand";
import type { Input } from "./ReferralConsentWithdrawal.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/** Destination slips turn individually under the participant's hand. */
export function ConsentSlips({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ConsentTurningHand frame={frame} input={input} accent={accent} />
      {input.permissions.map((permission, index) => (
        <ConsentSlip
          key={permission.id}
          permission={permission}
          index={index}
          frame={frame}
          input={input}
          accent={accent}
        />
      ))}
    </g>
  );
}
