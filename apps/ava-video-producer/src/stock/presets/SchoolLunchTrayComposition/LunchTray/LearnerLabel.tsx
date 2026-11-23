import { FitText } from "../../../primitives/FitText/FitText";
import type { ReactNode } from "react";

type Props = { text: string };

/** Names a learner below their meal tray for `LunchTray`. */
export function LearnerLabel({ text }: Readonly<Props>): ReactNode {
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
