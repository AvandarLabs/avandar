import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getConsentTurnFromPermissionsAndFrame } from "./getConsentTurnFromPermissionsAndFrame";
import type { Input } from "./ReferralConsentWithdrawal.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  input: Input;
  accent: string;
  permission: Input["permissions"][number];
  index: number;
};
/** A destination and purpose retain their scope on both faces of the slip. */
export function ConsentSlip({
  frame,
  input,
  accent,
  permission,
  index,
}: Readonly<Props>): ReactNode {
  const y = 190 + index * 102;
  const turn = getConsentTurnFromPermissionsAndFrame({
    frame,
    permissions: input.permissions,
    permissionId: permission.id,
  });
  const width = 460 * (0.12 + 0.88 * Math.abs(2 * turn - 1));
  return (
    <g data-permission={permission.id} data-withdrawn={turn === 1}>
      <rect
        data-slip={permission.id}
        x={48 + (460 - width) / 2}
        y={y}
        width={width}
        height={96}
        rx={5}
        fill={STOCK.surface}
        stroke={turn > 0.5 ? STOCK.orange : accent}
      />
      <g opacity={Math.abs(2 * turn - 1)}>
        <LabelSlots
          labels={[
            [permission.recipient, 58, y + 18, 440, 12, 1],
            [
              turn > 0.5 ? input.labels.withdrawn : input.labels.permitted,
              58,
              y + 76,
              440,
              12,
              1,
            ],
          ]}
        />
        {input.showPurpose ? (
          <LabelSlots labels={[[permission.purpose, 58, y + 49, 440, 12, 1]]} />
        ) : undefined}
      </g>
    </g>
  );
}
