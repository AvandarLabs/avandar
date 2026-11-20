import { propEq } from "@avandar/utils";
import { mix } from "../../../motion";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const { destinationX, destinationY } = _getDoseDestination(input, unit);
  const progress = motion.ramp(
    frame,
    36 + index * motion.stagger.list,
    motion.scale(50),
    motion.travel.easing,
  );
  return (
    <rect
      data-dose={unit.id}
      data-outcome={unit.outcome}
      data-recipient-id={unit.recipientId ?? undefined}
      x={mix(progress, 60 + (index % 4) * 48, destinationX)}
      y={mix(progress, 225 + Math.floor(index / 4) * 60, destinationY)}
      width={11}
      height={16}
      rx={scales.corner(3)}
      fill={unit.outcome === "discarded" ? tokens.color.highlight : accent}
      opacity={motion.reveal(frame, 12 + index * motion.stagger.list)}
    />
  );
}

/**
 * Where a dose ends up: beside its recipient if administered, else in the
 * remaining or discarded tray, packed among the doses sharing that place.
 */
function _getDoseDestination(input: Input, unit: Props["unit"]) {
  const peers = input.units.filter((item) => {
    return (
      item.outcome === unit.outcome &&
      (unit.outcome !== "administered" || item.recipientId === unit.recipientId)
    );
  });
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
  return { destinationX, destinationY };
}
