import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { opening: number };
/**
 * The opaque cover shares the brief's coordinate system and sits above its
 * complete paper.
 */
export function EnvelopeCover({ opening }: Readonly<Props>): ReactNode {
  return (
    <rect
      data-opaque-cover={opening === 0 ? "closed" : "peeling"}
      x={0}
      y={266 * opening}
      width={536}
      height={266 * (1 - opening)}
      fill={STOCK.elevated}
      fillOpacity={1}
      opacity={1}
    />
  );
}
