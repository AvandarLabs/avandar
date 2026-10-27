import { FitText } from "../../primitives/FitText/FitText";
import type { ReactNode } from "react";

type Props = { label: string; x: number; y: number };
/** Each item keeps its full label inside its own token slot. */
export function BatchItemLabel({ label, x, y }: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={label}
      x={x + 8}
      y={y + 18}
      width={84}
      fontSize={12}
      maxLines={3}
      normalizeWhitespace
      breakLongWords
    />
  );
}
