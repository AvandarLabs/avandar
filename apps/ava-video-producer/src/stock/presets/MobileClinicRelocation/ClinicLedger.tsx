import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ClinicLedgerValues } from "./ClinicLedgerValues/ClinicLedgerValues";
import type { Input } from "./MobileClinicRelocation.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/**
 * Person booking totals and finite slot capacity use different denominators.
 */
export function ClinicLedger({ input, frame }: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  const numBooked = input.people.filter(({ slotId }) => {
    return slotId !== null;
  }).length;
  const rows = [
    { label: input.copy.people, value: input.people.length, visible: true },
    { label: input.copy.booked, value: numBooked, visible: true },
    {
      label: input.copy.unbooked,
      value: input.people.length - numBooked,
      visible: true,
    },
    {
      label: input.copy.slots,
      value: `${numBooked} / ${input.slots.length}`,
      visible: input.showSlotLedger,
    },
    {
      label: input.copy.open,
      value: input.slots.length - numBooked,
      visible: input.showSlotLedger,
    },
  ];
  return (
    <g
      opacity={motion.ramp(frame, 114, motion.scale(10), motion.reveal.easing)}
    >
      <ClinicLedgerValues rows={rows} />
    </g>
  );
}
