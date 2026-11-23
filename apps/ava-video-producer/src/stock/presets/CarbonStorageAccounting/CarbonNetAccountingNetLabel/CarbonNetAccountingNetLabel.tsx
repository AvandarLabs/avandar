import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../CarbonStorageAccounting.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
};

/** Renders the net label with authored geometry. */
export function CarbonNetAccountingNetLabel({
  input,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={input.copy.net}
      x={540}
      y={446}
      width={380}
      fontSize={14}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
    />
  );
}
