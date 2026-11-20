import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The faint leader from an observer down to their name. */
export function ObserverLeader({
  personX,
  index,
  accent,
}: Readonly<{ personX: number; index: number; accent: string }>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${personX} 452 V468 H${index === 0 ? 100 : 550} V480`,
      }}
      profile={tokens.sketch.shape}
      stroke={accent}
      opacity={atomic.opacity["35"]}
      fill="none"
    />
  );
}
