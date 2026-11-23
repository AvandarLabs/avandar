import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { x: number; y: number; lift: number };

/** The raised edge that exposes an excluded tile. */
export function CutawayLip({ x, y, lift }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M${x} ${y}v${lift}h82v${-lift}` }}
      profile={tokens.sketch.shape}
      fill={tokens.color.surface}
      stroke={tokens.color.line}
    />
  );
}
