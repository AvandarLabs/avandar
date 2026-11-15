import type { Input } from "./WorkDecomposition.schema";

type Piece = {
  id: string;
  label: string;
  effort: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shiftX: number;
  shiftY: number;
};
/**
 * Slice the remaining slab, preserving exact relative area in either
 * layout.
 */
export function getWorkPartitionFromInput(input: Readonly<Input>): Piece[] {
  let remaining = input.workItems.reduce(
    (total, item) => total + item.effort,
    0,
  );
  let x = 90,
    y = 230,
    width = 500,
    height = 270,
    shiftX = 0,
    shiftY = 0;
  const numVertical =
    input.partitionLayout === "strips"
      ? input.workItems.length - 1
      : Math.ceil((input.workItems.length - 1) / 2);
  const numHorizontal = input.workItems.length - 1 - numVertical;
  return input.workItems.map((item, index) => {
    const vertical = input.partitionLayout === "strips" || index % 2 === 0;
    const fraction = item.effort / remaining;
    const pieceWidth = vertical ? width * fraction : width;
    const pieceHeight = vertical ? height : height * fraction;
    const piece = {
      ...item,
      x,
      y,
      width: pieceWidth,
      height: pieceHeight,
      shiftX: shiftX - numVertical * 4,
      shiftY: shiftY - numHorizontal * 4,
    };
    if (vertical) {
      x += pieceWidth;
      width -= pieceWidth;
      shiftX += 8;
    } else {
      y += pieceHeight;
      height -= pieceHeight;
      shiftY += 8;
    }
    remaining -= item.effort;
    return piece;
  });
}
