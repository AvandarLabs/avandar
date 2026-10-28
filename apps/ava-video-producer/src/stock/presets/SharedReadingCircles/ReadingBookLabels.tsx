import { propEq } from "@avandar/utils";
import { SceneText } from "./SceneText";
import type { Input } from "./SharedReadingCircles.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  groupIndex: number;
  frame: number;
  accent: string;
  tableX: number;
};
/** Draws the scene's ReadingBookLabels group with fixed authored geometry. */
export function ReadingBookLabels({
  input,
  groupIndex,
  frame,
  accent,
  tableX,
}: Readonly<Props>): ReactNode {
  const group = input.readingGroups[groupIndex];
  const book = input.books.find(propEq("id", group.bookId))!;
  const captionX =
    input.books.length === 1
      ? 480
      : 130 + (groupIndex * 705) / (input.books.length - 1);
  return (
    <>
      {input.showGroupCounts &&
      (input.startingShelf === "front" || frame >= 118) ? (
        <SceneText
          text={`${group.learnerIds.length} / ${input.learners.length}`}
          anchor="middle"
          slot={[tableX, 416, 80, 14, 1]}
        />
      ) : undefined}
      <g data-book-caption-key={book.id}>
        <SceneText
          text={String(groupIndex + 1)}
          color={accent}
          slot={[captionX - 107, 450, 20, 14, 1]}
        />
      </g>
      <SceneText
        text={book.label}
        anchor="middle"
        slot={[captionX + 12, 450, 190, 14, 3]}
      />
      {frame >= (input.startingShelf === "side" ? 118 : 108) ? (
        <SceneText
          text={book.pageLabel}
          anchor="middle"
          slot={[captionX, 513, 210, 12, 3]}
        />
      ) : undefined}
    </>
  );
}
