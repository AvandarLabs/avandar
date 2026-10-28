import { FitText } from "../../primitives/FitText/FitText";
import type { Input } from "./SpecimenAliquotBalance.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
/** Persistent fictional qualifier and common material unit. */
export function AliquotCaption({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={input.sceneLabel}
        x={50}
        y={40}
        width={850}
        fontSize={14}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.unitLabel}
        x={50}
        y={90}
        width={620}
        fontSize={16}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
