import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  id: string;
  x: number;
  y: number;
  width: number;
  progress: number;
  showExcludedRecords: boolean;
};
/** The exclusion sweep disappears with hidden excluded records. */
export function SubscriptionMask({
  id,
  x,
  y,
  width,
  progress,
  showExcludedRecords,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <StockRect
      data-excluded-mask={id}
      x={x + 12}
      y={y - 13}
      width={(width - 24) * progress}
      height={35}
      fill={tokens.color.ground}
      fillOpacity={atomic.opacity["14"]}
      stroke={tokens.color.highlight}
      strokeOpacity={progress * atomic.opacity["50"]}
      strokeDasharray={atomic.dash.short.join(" ")}
      opacity={showExcludedRecords ? 1 : 1 - progress}
    />
  );
}
