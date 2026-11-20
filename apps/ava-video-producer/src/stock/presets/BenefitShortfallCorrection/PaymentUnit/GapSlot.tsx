import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** A stated position that no token accounts for. */
export function GapSlot({
  x,
  y,
}: Readonly<{ x: number; y: number }>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "circle", cx: x, cy: y + 24, r: 18 }}
      profile={tokens.sketch.shape}
      data-unit-kind="gap"
      fill="none"
      stroke={tokens.color.highlight}
      strokeDasharray={atomic.dash.dotted.join(" ")}
    />
  );
}
