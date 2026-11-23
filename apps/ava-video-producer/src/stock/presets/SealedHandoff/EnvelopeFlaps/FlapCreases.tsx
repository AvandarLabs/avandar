import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The creases where the closed flaps meet. */
export function FlapCreases(): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: "M0 266 L268 134 L536 266 M0 0 L268 134 L536 0",
      }}
      profile={tokens.sketch.shape}
      fill="none"
      stroke={tokens.color.line}
    />
  );
}
