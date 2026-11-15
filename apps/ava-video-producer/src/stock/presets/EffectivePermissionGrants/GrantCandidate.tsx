import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { ROLE_RANK } from "./getEffectiveRoleFromInput";
import type { Input } from "./EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type Props = { input: Input; index: number; frame: number; accent: string };
/** Each candidate climbs to its own rank before its eligibility gate closes. */
export function GrantCandidate({
  input,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const grant = input.grants[index];
  const isExcluded =
    !grant.eligible || (input.restricted && grant.kind === "app-default");
  const placement = ramp(frame, 13 + index * 2, 31, EASE.inOut);
  const closure = isExcluded ? ramp(frame, 53 + index * 2, 39, EASE.inOut) : 0;
  const x = 255 + index * 90;
  const y = mix(placement, 440, 440 - ROLE_RANK[grant.role] * 90);
  const visibility = input.showExcludedGrants ? 1 : 1 - closure;
  return (
    <g data-grant-id={grant.id} data-grant-excluded={isExcluded}>
      <path d={`M${x} 440 V170`} stroke={STOCK.line} strokeDasharray="2 8" />
      <g opacity={visibility}>
        <circle
          data-grant-token={grant.id}
          cx={x + closure * 23}
          cy={y}
          r={11}
          fill={isExcluded ? STOCK.orange : accent}
        />
        <LabelSlots labels={[[grant.label, x - 40, 486, 80, 12, 5]]} />
      </g>
      {isExcluded ? (
        <path
          data-grant-gate={grant.id}
          d={`M${x - 20} ${y - 21} v42 M${x - 20} ${y} h${40 * closure}`}
          stroke={STOCK.orange}
          strokeWidth={3}
          fill="none"
          opacity={ramp(frame, 53, 8)}
        />
      ) : undefined}
    </g>
  );
}
