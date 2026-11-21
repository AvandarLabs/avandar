import { FitText } from "../../../primitives/FitText/FitText";
import type { ReactNode } from "react";

type Props = { text: string };

/** The case's name, centred under the resolution bracket. */
export function CaseLabel({ text }: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={text}
      x={480}
      y={546}
      width={820}
      fontSize={18}
      maxLines={2}
      anchor="middle"
      breakLongWords
      normalizeWhitespace
    />
  );
}
