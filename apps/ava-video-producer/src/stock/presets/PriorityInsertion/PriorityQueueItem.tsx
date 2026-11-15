import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  item: { id: string; label: string };
  x: number;
  y: number;
  accent: string;
  opacity: number;
  isIncoming?: boolean;
};
/** An authored queue item retains its identity as its whole slot moves. */
export function PriorityQueueItem({
  item,
  x,
  y,
  accent,
  opacity,
  isIncoming = false,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={opacity}>
      <rect
        data-queue-id={item.id}
        x={x}
        y={y}
        width={360}
        height={48}
        rx={6}
        fill={STOCK.surface}
        stroke={isIncoming ? accent : STOCK.line}
      />
      <FitText
        text={item.label}
        x={x + 16}
        y={y + 19}
        width={328}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
        color={isIncoming ? accent : STOCK.text}
      />
    </g>
  );
}
