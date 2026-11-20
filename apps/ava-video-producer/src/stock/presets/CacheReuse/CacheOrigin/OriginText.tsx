import { FitText } from "../../../primitives/FitText/FitText";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  text: string;
  y: number;
  size: ComponentProps<typeof FitText>["fontSize"];
  lines: number;
};
/** One fitted line of text inside the origin panel. */
export function OriginText({
  text,
  y,
  size,
  lines,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={text}
      x={430}
      y={y}
      width={470}
      fontSize={size}
      maxLines={lines}
      normalizeWhitespace
      breakLongWords
    />
  );
}
