import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { y: number };

/** The participant's dashed track across the visits. */
export function CohortTrack({ y }: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M280 ${y + 12} H900` }}
      profile={tokens.sketch.shape}
      stroke={tokens.color.line}
      strokeDasharray={atomic.dash.sparse.join(" ")}
    />
  );
}
