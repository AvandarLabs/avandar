import {
  getEffectiveRoleFromInput,
  ROLE_RANK,
} from "./getEffectiveRoleFromInput";
import { GrantCandidate } from "./GrantCandidate/GrantCandidate";
import { PermissionLadder } from "./PermissionLadder/PermissionLadder";
import { PermissionSceneHeadings } from "./PermissionSceneHeadings";
import { PermissionVerdict } from "./PermissionVerdict";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
      {input.grants.map((grant, index) => {
        return (
          <GrantCandidate
            key={grant.id}
            input={input}
            index={index}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <PermissionVerdict
        label={isAllowed ? input.labels.allowed : input.labels.denied}
        frame={frame}
      />
    </g>
  );
}
