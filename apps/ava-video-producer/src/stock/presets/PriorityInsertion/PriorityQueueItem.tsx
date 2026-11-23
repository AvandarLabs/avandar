import { FitText } from "../../primitives/FitText/FitText";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g opacity={opacity}>
      <StockRect
        data-queue-id={item.id}
        x={x}
        y={y}
        width={360}
        height={48}
        rx={scales.corner(6)}
        fill={tokens.color.surface}
        stroke={isIncoming ? accent : tokens.color.line}
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
        color={isIncoming ? accent : tokens.color.text}
      />
    </g>
  );
}
