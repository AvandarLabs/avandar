import { FitText } from "../../../primitives/FitText/FitText";
import type { ReactNode } from "react";

type Props = { text: string; x: number; width: number; maxLines: number };
/** A heading above one side of the boundary. */
export function BatchHeading({
  text,
  x,
  width,
  maxLines,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={text}
      x={x}
      y={64}
      width={width}
      fontSize={20}
      maxLines={maxLines}
      normalizeWhitespace
      breakLongWords
    />
  );
}
