import { propEq } from "@avandar/utils";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
  useGraphicMotion,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { getReadingGeometryFromInput } from "./getReadingGeometryFromInput";
import { PhysicalReadingBook } from "./PhysicalReadingBook";
import { ReadingBookLabels } from "./ReadingBookLabels";
import type { Input } from "./SharedReadingCircles.schema";
import type { ReactNode } from "react";

/** The reading table's horizontal radius. */
const TABLE_RADIUS_X = 94;
/** The reading table's vertical radius. */
const TABLE_RADIUS_Y = 48;
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
  const motion = useGraphicMotion();
  const group = input.readingGroups[groupIndex];
  const book = input.books.find(propEq("id", group.bookId))!;
  const { tableX, bookX, bookY } = getReadingGeometryFromInput({
    input,
    frame,
    groupIndex,
    motion,
  });
  return (
    <g>
      <ReadingTable tableX={tableX} />
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

function ReadingTable({ tableX }: Readonly<{ tableX: number }>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <SketchedShape
      shape={{
        kind: "ellipse",
        cx: tableX,
        cy: 330,
        rx: TABLE_RADIUS_X,
        ry: TABLE_RADIUS_Y,
      }}
      profile={tokens.sketch.shape}
      fill={tokens.color.surface}
      stroke={tokens.color.line}
      strokeWidth={scales.stroke(tokens.stroke.default)}
    />
  );
}
