import { FitText } from "../../../primitives/FitText/FitText";
import type { ReactNode } from "react";
/** Fits the authored normal-rule heading above the route for `RuleGate`. */
export function RuleLabel({ text }: Readonly<{ text: string }>): ReactNode {
  return (
    <FitText
      text={text}
      x={480}
      y={50}
      width={840}
      fontSize={24}
      maxLines={3}
      anchor="middle"
      breakLongWords
      normalizeWhitespace
    />
  );
}
