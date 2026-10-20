import { STOCK } from "../../stockPalette";
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
  return (
    <rect
      data-excluded-mask={id}
      x={x + 12}
      y={y - 13}
      width={(width - 24) * progress}
      height={35}
      fill={STOCK.ground}
      fillOpacity={0.14}
      stroke={STOCK.orange}
      strokeOpacity={progress * 0.5}
      strokeDasharray="3 4"
      opacity={showExcludedRecords ? 1 : 1 - progress}
    />
  );
}
