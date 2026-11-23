import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { type Props } from "./SubscriptionFrameShared.types";
import type { ReactNode } from "react";
/** The connector to a view: solid when subscribed, sparse dashes when not. */
export function SubscriptionConnector({
  view,
  x,
  width,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g data-subscription={view.id}>
      <SketchedShape
        shape={{ kind: "path", d: `M479 134 V136 H${x + width / 2} V140` }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={view.subscribed ? accent : tokens.color.inactive}
        strokeDasharray={
          view.subscribed ? undefined : atomic.dash.sparse.join(" ")
        }
      />
    </g>
  );
}
