import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { ClinicLedger } from "./ClinicLedger";
import { ClinicMap } from "./ClinicMap";
import { ClinicPeople } from "./ClinicPeople";
import { ClinicSlots } from "./ClinicSlots";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./MobileClinicRelocation.schema";
import type { ReactNode } from "react";
/** Supplied sites, finite slots and explicit nullable assignments. */
export type Props = GraphicProps & { input: Input };
/**
 * One service vehicle relocates without inventing bookings or care delivery.
 */
export function MobileClinicRelocation({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 12, 18)}>
      <FitText
        text={input.sceneLabel}
        x={50}
        y={38}
        width={850}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.copy.map}
        x={50}
        y={72}
        width={850}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <ClinicMap input={input} frame={frame} accent={accent} />
      <FitText
        text={input.copy.clinic}
        x={50}
        y={334}
        width={480}
        fontSize={14}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <ClinicSlots input={input} frame={frame} accent={accent} />
      <ClinicPeople input={input} frame={frame} accent={accent} />
      <ClinicLedger input={input} frame={frame} />
    </g>
  );
}
