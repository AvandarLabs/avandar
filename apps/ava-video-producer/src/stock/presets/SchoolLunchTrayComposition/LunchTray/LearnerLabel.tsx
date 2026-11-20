import { FitText } from "../../../primitives/FitText/FitText";
import type { ReactNode } from "react";
/** Names a learner below their meal tray for `LunchTray`. */
export function LearnerLabel({ text }: Readonly<{ text: string }>): ReactNode {
  return (
    <FitText
      text={text}
      x={0}
      y={122}
      width={132}
      fontSize={14}
      maxLines={3}
      anchor="middle"
      breakLongWords
      normalizeWhitespace
    />
  );
}
