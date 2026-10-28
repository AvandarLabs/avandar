import { FitText } from "../../primitives/FitText/FitText";
import type { ReactNode } from "react";
type Props = {
  text: string;
  x: number;
  y: number;
  width?: number;
  lines?: number;
  color?: string;
};
/** Fixed readable labels keep exact authored copy in aria. */
export function SceneLabel({
  text,
  x,
  y,
  width = 400,
  lines = 3,
  color,
}: Readonly<Props>): ReactNode {
  return (
    <FitText
      text={text}
      x={x}
      y={y}
      width={width}
      maxLines={lines}
      fontSize={12}
      color={color}
      normalizeWhitespace
      breakLongWords
    />
  );
}
