import { FitText } from "../../../primitives/FitText/FitText";
import type { ReactNode } from "react";

type Props = { text: string; slotX: number; y: number; color?: string };
/** One fitted line of text inside an attempt's label slot. */
export function SlotText({
  text,
  slotX,
  y,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={text}
      x={slotX + 8}
      y={y}
      width={174}
      fontSize={14}
      maxLines={3}
      normalizeWhitespace
      breakLongWords
      color={color}
    />
  );
}
