import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { Input } from "../EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type Props = {
  grant: Input["grants"][number];
  x: number;
  y: number;
  closure: number;
  color: string;
};
/** The grant's token at its rank, pushed aside as its gate closes. */
export function GrantToken({
  grant,
  x,
  y,
  closure,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <circle
        data-grant-token={grant.id}
        cx={x + closure * 23}
        cy={y}
        r={11}
        fill={color}
      />
      <LabelSlots labels={[[grant.label, x - 40, 486, 80, 12, 5]]} />
    </>
  );
}
