import { FitText } from "../../../primitives/FitText/FitText";
import type { Input } from "../AquiferAllocationBalance.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
};

/** Renders the requested label with authored geometry. */
export function AquiferCutawayRequestedLabel({
  input,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={input.copy.requested}
      x={44}
      y={338}
      width={186}
      fontSize={12}
      maxLines={3}
      breakLongWords
      normalizeWhitespace
    />
  );
}
