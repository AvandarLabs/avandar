import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { GrantCandidateShared } from "./GrantCandidateShared/GrantCandidateShared";
import type { ReactNode } from "react";
/** The dashed rail a grant climbs. */
export function GrantRail({ x }: Readonly<{ x: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M${x} 440 V170` }}
      profile={tokens.sketch.shape}
      stroke={tokens.color.line}
      strokeDasharray={GrantCandidateShared.RAIL_DASH}
    />
  );
}
