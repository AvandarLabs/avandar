import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { index: number; x: number; y: number };

/** A dashed guide at the host's full capacity, kept while the bay folds. */
export function CapacityGuide({ index, x, y }: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M${x} ${y}h180` }}
      profile={tokens.sketch.shape}
      data-guide={index}
      stroke={tokens.color.inactive}
      strokeDasharray={atomic.dash.short.join(" ")}
    />
  );
}
