import { FitText } from "../../primitives/FitText/FitText";
import type { ReactNode } from "react";
type Props = {
  text: string;
  x: number;
  y: number;
  width: number;
  lines?: number;
  color?: string;
};
/** Fixed readable labels preserve original authored copy in aria. */
export function SceneLabel({
  text,
  x,
  y,
  width,
  lines = 3,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={text}
      x={x}
      y={y}
      width={width}
      fontSize={12}
      maxLines={lines}
      breakLongWords
      normalizeWhitespace
      color={color}
    />
  );
}
