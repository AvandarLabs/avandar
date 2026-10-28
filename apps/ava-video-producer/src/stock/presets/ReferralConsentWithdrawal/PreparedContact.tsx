import { mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ContactCard } from "./ContactCard";
import { ContactHandling } from "./ContactHandling";
import type { Input } from "./ReferralConsentWithdrawal.schema";
import type { ReactNode } from "react";
type Props = {
  frame: number;
  labels: Input["labels"];
  accent: string;
  contact: Input["plannedContacts"][number];
  index: number;
  order: number;
  permissionTurn: number;
};
/** The worker stops below the idle phone and deposits a preparation. */
export function PreparedContact({
  frame,
  labels,
  accent,
  contact,
  index,
  order,
  permissionTurn,
}: Readonly<Props>): ReactNode {
  const progress = order < 0 ? 0 : ramp(frame, 60 + order * 16, 16);
  const x = mix(progress, 520, 560);
  const y = 194 + index * 102 - 20 * Math.sin(progress * Math.PI);
  const isHandling =
    order >= 0 && frame >= 60 + order * 16 && frame <= 76 + order * 16;
  return (
    <g>
      <ContactHandling
        contactId={contact.id}
        index={index}
        x={x}
        y={y}
        isAffected={order >= 0}
        isHandling={isHandling}
      />
      <ContactCard
        contact={contact}
        x={x}
        y={y}
        isHeld={progress === 1}
        status={
          permissionTurn > 0.5
            ? progress === 1
              ? labels.held
              : labels.withdrawn
            : labels.permitted
        }
        color={order >= 0 ? STOCK.orange : accent}
      />
    </g>
  );
}
