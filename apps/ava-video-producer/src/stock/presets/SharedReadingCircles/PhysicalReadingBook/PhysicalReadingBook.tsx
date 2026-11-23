import { SketchedShape } from "../../../primitives/SketchedShape";
import { SceneText } from "../SceneText";
import { ReadingBookCover } from "./ReadingBookCover";
import { ReadingBookPageTurn } from "./ReadingBookPageTurn";
import { usePhysicalReadingBookPresentation } from "./usePhysicalReadingBookPresentation";
import type { ReactNode } from "react";

type Props = {
  bookId: string;
  groupIndex: number;
  frame: number;
  accent: string;
  bookX: number;
  bookY: number;
};
/** Draws the scene's PhysicalReadingBook group with fixed authored geometry. */
export function PhysicalReadingBook(props: Readonly<Props>): ReactNode {
  const presentation = usePhysicalReadingBookPresentation(props);

  return (
    <>
      <g
        data-book-id={presentation.book.id}
        transform={`translate(${props.bookX} ${props.bookY})`}
      >
        <ReadingBookCover {...presentation} />
        <SketchedShape
          shape={{
            kind: "path",
            d: `M0 -14 V23 M${-presentation.halfWidth + 6} -7 H-7 M7 -7 H${presentation.halfWidth - 6} M${-presentation.halfWidth + 6} 3 H-7 M7 3 H${presentation.halfWidth - 6}`,
          }}
          profile={presentation.tokens.sketch.shape}
          fill="none"
          stroke={props.accent}
          strokeOpacity={presentation.opening}
        />
        <ReadingBookPageTurn {...presentation} />
        <g data-book-key={presentation.book.id}>
          <SketchedShape
            shape={{ kind: "circle", cx: 0, cy: 0, r: 10 }}
            profile={presentation.tokens.sketch.shape}
            fill={presentation.tokens.color.surface}
            stroke={props.accent}
          />
          <SceneText
            text={String(props.groupIndex + 1)}
            anchor="middle"
            slot={[0, 4, 18, 12, 1]}
          />
        </g>
      </g>
    </>
  );
}
