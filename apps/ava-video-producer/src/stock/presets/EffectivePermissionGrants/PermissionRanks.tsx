import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import { ROLE_RANK } from "./getEffectiveRoleFromInput";
import type { Input } from "./EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Every role occupies a stable rank with its complete authored label. */
export function PermissionRanks({ input }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {" "}
      {(["none", "viewer", "editor", "admin"] as const).map((role) => {
        return (
          <g key={role}>
            <SketchedShape
              shape={{
                kind: "path",
                d: `M210 ${440 - ROLE_RANK[role] * 90} H820`,
              }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.line}
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
        );
      })}
    </g>
  );
}
