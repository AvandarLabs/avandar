import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PermissionRoles } from "./PermissionRoles";
import type { Input } from "./EffectivePermissionGrants.schema";
import type { ReactNode } from "react";

type Props = { input: Input };
/** Every role occupies a stable rank with its complete authored label. */
export function PermissionRanks({ input }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      {" "}
      {PermissionRoles.values.map((role) => {
        return (
          <g key={role}>
            <SketchedShape
              shape={{
                kind: "path",
                d: `M210 ${440 - PermissionRoles.rank[role] * 90} H820`,
              }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.line}
            />
            <LabelSlots
              labels={[
                [
                  input.labels[role],
                  55,
                  440 - PermissionRoles.rank[role] * 90 + 5,
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
