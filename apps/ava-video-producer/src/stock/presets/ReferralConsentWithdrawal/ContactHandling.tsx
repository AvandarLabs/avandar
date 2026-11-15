import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  contactId: string;
  index: number;
  x: number;
  y: number;
  isAffected: boolean;
  isHandling: boolean;
};
/** The held tray and moving worker hand share the card's actual geometry. */
export function ContactHandling({
  contactId,
  index,
  x,
  y,
  isAffected,
  isHandling,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      {isAffected ? (
        <path
          data-tray={contactId}
          d={`M550 ${281 + index * 102} v16 h366 v-13`}
          fill="none"
          stroke={STOCK.orange}
          strokeWidth={3}
        />
      ) : undefined}
      {isHandling ? (
        <path
          data-worker-hand={contactId}
          d={`M760 150 L${x + 350} ${y + 28}`}
          fill="none"
          stroke={STOCK.cyan}
          strokeWidth={4}
          strokeLinecap="round"
        />
      ) : undefined}
    </g>
  );
}
