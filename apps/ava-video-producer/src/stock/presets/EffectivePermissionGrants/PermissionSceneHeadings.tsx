import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import {
  controls,
  RESTRICTION_MESSAGE,
} from "./EffectivePermissionGrants.controls";
import type { Input } from "./EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Resource, restriction and action labels stay independent of candidates. */
export function PermissionSceneHeadings({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      <LabelSlots
        labels={[
          [input.labels.resource, 55, 55, 820, 20, 2],
          [controls[2].label.message, 700, 115, 205, 12, 2],
        ]}
      />
      {input.restricted ? (
        <LabelSlots
          labels={[[RESTRICTION_MESSAGE.message, 55, 112, 620, 14, 2]]}
        />
      ) : undefined}
    </g>
  );
}
