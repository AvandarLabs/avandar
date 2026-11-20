import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { SubscriptionConnector } from "./SubscriptionConnector";
import { type Props } from "./SubscriptionFrameShared.types";
import type { ReactNode } from "react";
/** A connector stops explicitly at the independent reference view. */
export function SubscriptionFrame({
  view,
  x,
  width,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <SubscriptionConnector view={view} x={x} width={width} accent={accent} />
      {view.subscribed ? undefined : (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x + width / 2 - 6} 125 l12 12 m0 -12 l-12 12`,
          }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
        />
      )}
      <StockRect
        x={x}
        y={140}
        width={width}
        height={456}
        rx={scales.corner(tokens.corner.card)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <LabelSlots labels={[[view.label, x + 12, 162, width - 24, 14, 3]]} />
    </g>
  );
}
