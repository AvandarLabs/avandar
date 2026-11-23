import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-contact={contact.id} data-state={isHeld ? "held" : "prepared"}>
      <StockRect
        data-contact-card={contact.id}
        x={x}
        y={y}
        width={350}
        height={100}
        rx={scales.corner(5)}
        fill={tokens.color.surface}
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
