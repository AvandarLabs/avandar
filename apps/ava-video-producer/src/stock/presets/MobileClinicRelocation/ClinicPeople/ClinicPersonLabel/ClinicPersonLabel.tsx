import { FitText } from "../../../../primitives/FitText/FitText";
import type { Input } from "../../MobileClinicRelocation.schema";
import type { ReactNode } from "react";

type Props = {
  person: Input["people"][number];
  x: number;
  y: number;
};

/** Renders the label label with authored geometry. */
export function ClinicPersonLabel({
  person,
  x,
  y,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={person.label}
      x={x - 20}
      y={y + 27}
      width={110}
      fontSize={12}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
    />
  );
}
