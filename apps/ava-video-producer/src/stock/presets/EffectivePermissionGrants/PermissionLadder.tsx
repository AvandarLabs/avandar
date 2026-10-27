import { EASE, mix, ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import {
  getEffectiveRoleFromInput,
  ROLE_RANK,
} from "./getEffectiveRoleFromInput";
import { PermissionRanks } from "./PermissionRanks";
import type { Input } from "./EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** A result marker rises separately from the fixed action-requirement notch. */
export function PermissionLadder({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const effective = getEffectiveRoleFromInput(input);
  const resultY = mix(
    ramp(frame, 101, 38, EASE.inOut),
    440,
    440 - ROLE_RANK[effective] * 90,
  );
  const requiredY = 440 - ROLE_RANK[input.requiredRole] * 90;
  return (
    <g>
      <PermissionRanks input={input} />
      <path d="M790 440 V170" stroke={STOCK.muted} />
      <path
        data-required-notch={input.requiredRole}
        d={`M725 ${requiredY - 10} v20 l16 -10 Z`}
        stroke={STOCK.orange}
        fill={STOCK.orange}
      />
      <circle
        data-result-marker="true"
        cx={790}
        cy={resultY}
        r={14}
        stroke={accent}
        strokeWidth={3}
        fill={STOCK.ground}
      />
      <path
        d={`M754 ${requiredY} H770 V${resultY} H776`}
        stroke={STOCK.orange}
        fill="none"
        opacity={ramp(frame, 132, 7)}
      />
      <g opacity={ramp(frame, 132, 7)}>
        <LabelSlots
          labels={[[input.labels[effective], 720, 488, 185, 16, 4]]}
        />
      </g>
    </g>
  );
}
