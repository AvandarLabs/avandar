import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import {
  getEffectiveRoleFromInput,
  ROLE_RANK,
} from "./getEffectiveRoleFromInput";
import { GrantCandidate } from "./GrantCandidate";
import { PermissionLadder } from "./PermissionLadder";
import { PermissionSceneHeadings } from "./PermissionSceneHeadings";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./EffectivePermissionGrants.schema";
import type { ReactNode } from "react";
/** Frame-driven authored study props. */
export type Props = GraphicProps & { input: Input };
/** Qualifying grants combine by maximum rank, then meet an action notch. */
export function EffectivePermissionGrants({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const effective = getEffectiveRoleFromInput(input);
  const isAllowed = ROLE_RANK[effective] >= ROLE_RANK[input.requiredRole];
  return (
    <g
      data-effective-role={effective}
      data-allowed={isAllowed}
      data-restricted={input.restricted}
    >
      <PermissionSceneHeadings input={input} />
      <PermissionLadder input={input} frame={frame} accent={accent} />
      {input.grants.map((grant, index) => (
        <GrantCandidate
          key={grant.id}
          input={input}
          index={index}
          frame={frame}
          accent={accent}
        />
      ))}
      <g opacity={ramp(frame, 139, 1)}>
        <LabelSlots
          labels={[
            [
              isAllowed ? input.labels.allowed : input.labels.denied,
              55,
              580,
              840,
              18,
              1,
            ],
          ]}
        />
      </g>
    </g>
  );
}
