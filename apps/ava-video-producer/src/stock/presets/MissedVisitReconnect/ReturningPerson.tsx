import { EASE, mix, ramp } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";
type Props = {
  item: Input["cases"][number];
  index: number;
  y: number;
  frame: number;
  accent: string;
};
/** A recorded attendee alone travels fully inside the clinic doorway. */
export function ReturningPerson({
  item,
  index,
  y,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const x =
    item.outcome === "attended"
      ? mix(ramp(frame, 91 + index * 2, 13, EASE.inOut), 240, 830)
      : 240;
  return (
    <g data-returning-person={item.id} transform={`translate(${x} ${y})`}>
      <PersonGlyph x={0} y={0} size={29} color={accent} />
    </g>
  );
}
