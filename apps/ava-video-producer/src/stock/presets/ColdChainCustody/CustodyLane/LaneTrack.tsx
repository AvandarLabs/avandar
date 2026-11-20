import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";
/** The dashed track the container travels along. */
export function LaneTrack({ y }: Readonly<{ y: number }>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <SketchedShape
      shape={{ kind: "path", d: `M280 ${y} H740` }}
      profile={tokens.sketch.shape}
      stroke={tokens.color.line}
      strokeDasharray={atomic.dash.spaced.join(" ")}
    />
  );
}
