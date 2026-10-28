import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ReferralConsentWithdrawal.schema";
import type { ReactNode } from "react";
type Props = {
  contact: Input["plannedContacts"][number];
  x: number;
  y: number;
  isHeld: boolean;
  status: string;
  color: string;
};
/** A prepared or held card never depicts a completed contact. */
export function ContactCard({
  contact,
  x,
  y,
  isHeld,
  status,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <g data-contact={contact.id} data-state={isHeld ? "held" : "prepared"}>
      <rect
        data-contact-card={contact.id}
        x={x}
        y={y}
        width={350}
        height={100}
        rx={5}
        fill={STOCK.surface}
        stroke={color}
      />
      <LabelSlots
        labels={[
          [contact.label, x + 10, y + 16, 330, 12, 3],
          [status, x + 10, y + 64, 330, 12, 3],
        ]}
      />
    </g>
  );
}
