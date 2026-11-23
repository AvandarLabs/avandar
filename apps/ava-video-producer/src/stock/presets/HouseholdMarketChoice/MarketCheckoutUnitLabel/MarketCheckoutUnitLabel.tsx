import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../HouseholdMarketChoice.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
};

/** Renders the unit label with authored geometry. */
export function MarketCheckoutUnitLabel({ input }: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={input.labels.unit}
      x={640}
      y={521}
      width={190}
      fontSize={12}
      maxLines={3}
      normalizeWhitespace
      breakLongWords
    />
  );
}
