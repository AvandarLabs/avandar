import { FitText } from "../../../primitives/FitText/FitText";
import type { CarbonStorageAccounting } from "../CarbonStorageAccounting";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof CarbonStorageAccounting>[0]["input"];
};

/** Renders the disclaimer label with authored geometry. */
export function CarbonStorageAccountingDisclaimerLabel({
  input,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={input.copy.disclaimer}
      x={50}
      y={585}
      width={870}
      fontSize={12}
      maxLines={1}
      breakLongWords
      normalizeWhitespace
    />
  );
}
