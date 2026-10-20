import { propEq } from "@avandar/utils";
import { STOCK } from "../../stockPalette";
import { getReadingGeometryFromInput } from "./getReadingGeometryFromInput";
import { PhysicalReadingBook } from "./PhysicalReadingBook";
import { ReadingBookLabels } from "./ReadingBookLabels";
import type { Input } from "./SharedReadingCircles.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  groupIndex: number;
  frame: number;
  accent: string;
};
/** One copy opens and turns one page without duplicating its inventory. */
export function ReadingBook({
  input,
  groupIndex,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const group = input.readingGroups[groupIndex];
  const book = input.books.find(propEq("id", group.bookId))!;
  const { tableX, bookX, bookY } = getReadingGeometryFromInput({
    input,
    frame,
    groupIndex,
  });
  return (
    <g>
      <ellipse
        cx={tableX}
        cy={330}
        rx={94}
        ry={48}
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={2}
      />
      <PhysicalReadingBook
        bookId={book.id}
        groupIndex={groupIndex}
        frame={input.startingShelf === "side" ? frame - 10 : frame}
        accent={accent}
        bookX={bookX}
        bookY={bookY}
      />
      <ReadingBookLabels
        input={input}
        groupIndex={groupIndex}
        frame={frame}
        accent={accent}
        tableX={tableX}
      />
    </g>
  );
}
