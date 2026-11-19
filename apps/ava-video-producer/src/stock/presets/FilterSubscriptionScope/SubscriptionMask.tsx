import { StockRect } from "../../primitives/StockRect/StockRect";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
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
/** The mask outline's opacity once the sweep completes. */
const MASK_OUTLINE_OPACITY = 0.5;
/** The dash of the mask outline. */
const MASK_DASH = "3 4";
/** The exclusion sweep disappears with hidden excluded records. */
export function SubscriptionMask({
  id,
  x,
  y,
  width,
  progress,
  showExcludedRecords,
}: Readonly<Props>): ReactNode {
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
      strokeOpacity={progress * MASK_OUTLINE_OPACITY}
      strokeDasharray={MASK_DASH}
      opacity={showExcludedRecords ? 1 : 1 - progress}
    />
  );
}
