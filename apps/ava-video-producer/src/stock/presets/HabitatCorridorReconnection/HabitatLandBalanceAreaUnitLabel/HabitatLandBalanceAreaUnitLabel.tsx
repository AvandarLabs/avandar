import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../HabitatCorridorReconnection.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
};

/** Renders the area unit label with authored geometry. */
export function HabitatLandBalanceAreaUnitLabel({
  input,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={input.copy.areaUnit}
      x={32}
      y={467}
      width={896}
      fontSize={12}
      maxLines={1}
      breakLongWords
      normalizeWhitespace
    />
  );
}
