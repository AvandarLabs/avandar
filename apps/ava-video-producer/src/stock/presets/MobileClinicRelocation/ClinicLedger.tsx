import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./MobileClinicRelocation.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/**
 * Person booking totals and finite slot capacity use different denominators.
 */
export function ClinicLedger({ input, frame }: Readonly<Props>): ReactNode {
  const numBooked = input.people.filter(({ slotId }) => slotId !== null).length;
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
    <g opacity={ramp(frame, 114, 10)}>
      {rows.map((row, index) =>
        row.visible ? (
          <g key={index}>
            <FitText
              text={String(row.value)}
              x={50 + index * 180}
              y={495}
              width={165}
              fontSize={18}
              maxLines={1}
              normalizeWhitespace
            />
            <FitText
              text={row.label}
              x={50 + index * 180}
              y={516}
              width={165}
              fontSize={12}
              maxLines={6}
              breakLongWords
              normalizeWhitespace
            />
          </g>
        ) : undefined,
      )}
    </g>
  );
}
