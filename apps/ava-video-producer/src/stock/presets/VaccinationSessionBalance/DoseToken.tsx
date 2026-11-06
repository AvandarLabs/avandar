import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./VaccinationSessionBalance.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  unit: Input["units"][number];
  index: number;
  frame: number;
  accent: string;
};
/** Each stock unit has one persistent glyph and one authored destination. */
export function DoseToken({
  input,
  unit,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const peers = input.units.filter(
    (item) =>
      item.outcome === unit.outcome &&
      (unit.outcome !== "administered" ||
        item.recipientId === unit.recipientId),
  );
  const position = peers.findIndex(propEq("id", unit.id));
  const recipientIndex = input.recipients.findIndex(
    propEq<{ id: unknown }, "id", unknown>("id", unit.recipientId),
  );
  const destinationX =
    unit.outcome === "administered"
      ? 340 + (recipientIndex % 2) * 185 + (position % 6) * 17
      : 710 + (position % 6) * 38;
  const destinationY =
    unit.outcome === "administered"
      ? 189 +
        Math.floor(recipientIndex / 2) * 90 +
        Math.floor(position / 6) * 19
      : (unit.outcome === "remaining" ? 220 : 400) +
        Math.floor(position / 6) * 30;
  const progress = ramp(frame, 36 + index * 2, 50, EASE.inOut);
  return (
    <rect
      data-dose={unit.id}
      data-outcome={unit.outcome}
      data-recipient-id={unit.recipientId ?? undefined}
      x={mix(progress, 60 + (index % 4) * 48, destinationX)}
      y={mix(progress, 225 + Math.floor(index / 4) * 60, destinationY)}
      width={11}
      height={16}
      rx={3}
      fill={unit.outcome === "discarded" ? STOCK.orange : accent}
      opacity={ramp(frame, 12 + index * 2, 12)}
    />
  );
}
