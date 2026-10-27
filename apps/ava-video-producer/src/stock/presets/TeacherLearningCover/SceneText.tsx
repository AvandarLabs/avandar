import { FitText } from "../../primitives/FitText/FitText";
import { type FitTextSize } from "../../primitives/FitText/wrapTextToLines";
import type { ReactNode } from "react";
type Props = {
  text: string;
  slot: readonly [
    x: number,
    y: number,
    width: number,
    size: FitTextSize,
    lines: number,
  ];
  anchor?: "start" | "middle" | "end";
  color?: string;
};
/** Fixed scene text slots retain complete authored copy and whole graphemes. */
export function SceneText({
  text,
  slot,
  anchor,
  color,
}: Readonly<Props>): ReactNode {
  const [x, y, width, fontSize, maxLines] = slot;
  return (
    <FitText
      text={text}
      x={x}
      y={y}
      width={width}
      fontSize={fontSize}
      maxLines={maxLines}
      anchor={anchor}
      color={color}
      breakLongWords
      normalizeWhitespace
    />
  );
}
