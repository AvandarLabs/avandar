import { stockI18n } from "../../i18n/stockI18n/stockI18n";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { STOCK } from "../../stockPalette";
import { PENDING_DELIVERY_MESSAGE } from "./AtomicOutboxCommit.controls";
import type { Input } from "./AtomicOutboxCommit.schema";
import type { ReactNode } from "react";
type Props = { input: Input; accent: string };
/** A committed matching obligation remains pending for delivery. */
export function PendingDeliveryTicket({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g data-durable-ticket={input.change.id} data-ticket-state="pending">
      <rect
        x={540}
        y={235}
        width={320}
        height={145}
        rx={5}
        fill={STOCK.elevated}
        stroke={accent}
      />
      <LabelSlots
        labels={[[stockI18n._(PENDING_DELIVERY_MESSAGE), 552, 230, 296, 14, 2]]}
      />
      <LiteralDataText x={552} y={315} value={input.change.after} />
      {input.showIdentifier ? (
        <LiteralDataText x={552} y={350} value={input.change.id} />
      ) : undefined}
    </g>
  );
}
