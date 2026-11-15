import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
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
  return (
    <g>
      <path
        data-subscription={view.id}
        d={`M479 134 V136 H${x + width / 2} V140`}
        fill="none"
        stroke={view.subscribed ? accent : STOCK.muted}
        strokeDasharray={view.subscribed ? undefined : "3 6"}
      />
      {view.subscribed ? undefined : (
        <path
          d={`M${x + width / 2 - 6} 125 l12 12 m0 -12 l-12 12`}
          stroke={STOCK.orange}
        />
      )}
      <rect
        x={x}
        y={140}
        width={width}
        height={456}
        rx={12}
        fill={STOCK.surface}
        stroke={STOCK.line}
      />
      <LabelSlots labels={[[view.label, x + 12, 162, width - 24, 14, 3]]} />
    </g>
  );
}
