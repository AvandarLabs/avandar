import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { PENDING_DELIVERY_MESSAGE } from "./AtomicOutboxCommit.controls";
import type { Input } from "./AtomicOutboxCommit.schema";
import type { ReactNode } from "react";

type Props = { input: Input; accent: string };
/** The ticket's corner before the corner style scales it. */
const TICKET_CORNER = 5;
/** A committed matching obligation remains pending for delivery. */
export function PendingDeliveryTicket({
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-durable-ticket={input.change.id} data-ticket-state="pending">
      <StockRect
        x={540}
        y={235}
        width={320}
        height={145}
        rx={scales.corner(TICKET_CORNER)}
        fill={tokens.color.elevated}
        stroke={accent}
      />
      <LabelSlots
        labels={[[PENDING_DELIVERY_MESSAGE.message, 552, 230, 296, 14, 2]]}
      />
      <LiteralDataText x={552} y={315} value={input.change.after} />
      {input.showIdentifier ? (
        <LiteralDataText x={552} y={350} value={input.change.id} />
      ) : undefined}
    </g>
  );
}
