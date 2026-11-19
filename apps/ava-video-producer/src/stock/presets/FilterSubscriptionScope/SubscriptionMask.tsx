import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicTheme, useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  id: string;
  x: number;
  y: number;
  width: number;
  progress: number;
  showExcludedRecords: boolean;
};

/** How strongly the exclusion mask darkens a row. */
const MASK_OPACITY = 0.14;
/** The exclusion sweep disappears with hidden excluded records. */
export function SubscriptionMask({
  id,
  x,
  y,
  width,
  progress,
  showExcludedRecords,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  return (
    <StockRect
      data-excluded-mask={id}
      x={x + 12}
      y={y - 13}
      width={(width - 24) * progress}
      height={35}
      fill={tokens.color.ground}
      fillOpacity={MASK_OPACITY}
      stroke={tokens.color.highlight}
      strokeOpacity={progress * atomic.opacity["50"]}
      strokeDasharray={atomic.dash.short.join(" ")}
      opacity={showExcludedRecords ? 1 : 1 - progress}
    />
  );
}
