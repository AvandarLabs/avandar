import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The faint leader from a site to its row on the key rail. */
export function SiteLeader({
  x,
  y,
  railY,
}: Readonly<{ x: number; y: number; railY: number }>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M${x} ${y} L628 ${railY}` }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={tokens.color.inactive}
      strokeOpacity={atomic.opacity["20"]}
    />
  );
}
