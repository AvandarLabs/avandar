import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicShapeScales, useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./FilterSubscriptionScope.schema";
import type { ReactNode } from "react";

type Props = {
  view: Input["views"][number];
  x: number;
  width: number;
  accent: string;
};

/** A connector stops explicitly at the independent reference view. */
export function SubscriptionFrame({
  view,
  x,
  width,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <g data-subscription={view.id}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M479 134 V136 H${x + width / 2} V140`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={view.subscribed ? accent : tokens.color.inactive}
          strokeDasharray={view.subscribed ? undefined : atomic.dash.sparse.join(" ")}
        />
      </g>
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
