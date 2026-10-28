import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { ROLE_RANK } from "./getEffectiveRoleFromInput";
import type { Input } from "./EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Every role occupies a stable rank with its complete authored label. */
export function PermissionRanks({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      {(["none", "viewer", "editor", "admin"] as const).map((role) => (
        <g key={role}>
          <path
            d={`M210 ${440 - ROLE_RANK[role] * 90} H820`}
            stroke={STOCK.line}
          />
          <LabelSlots
            labels={[
              [
                input.labels[role],
                55,
                440 - ROLE_RANK[role] * 90 + 5,
                145,
                14,
                5,
              ],
            ]}
          />
        </g>
      ))}
    </g>
  );
}
