import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { SceneText } from "./SceneText";
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
export function PhysicalReadingBook({
  bookId,
  groupIndex,
  frame,
  accent,
  bookX,
  bookY,
}: Readonly<Props>): ReactNode {
  const book = { id: bookId };
  const opening = ramp(frame, 94, 14);
  const halfWidth = 22 + 18 * opening;
  const pageTurn = ramp(frame, 116, 16);
  return (
    <>
      <g data-book-id={book.id} transform={`translate(${bookX} ${bookY})`}>
        <path
          data-book-cover={book.id}
          d={`M${-halfWidth} -19 H-3 L0 -14 L3 -19 H${halfWidth} V19 H3 L0 23 L-3 19 H${-halfWidth} Z`}
          fill={STOCK.elevated}
          stroke={accent}
          strokeWidth={2}
        />
        <path
          d={`M0 -14 V23 M${-halfWidth + 6} -7 H-7 M7 -7 H${halfWidth - 6} M${-halfWidth + 6} 3 H-7 M7 3 H${halfWidth - 6}`}
          fill="none"
          stroke={accent}
          strokeOpacity={opening}
        />
        {pageTurn > 0 && pageTurn < 1 ? (
          <path
            data-page-turn={book.id}
            d={`M0 -15 L${(1 - 2 * pageTurn) * 34} -21 V14 L0 21 Z`}
            fill={STOCK.cyan}
            stroke={accent}
          />
        ) : undefined}
        <g data-book-key={book.id}>
          <circle cx={0} cy={0} r={10} fill={STOCK.surface} stroke={accent} />
          <SceneText
            text={String(groupIndex + 1)}
            anchor="middle"
            slot={[0, 4, 18, 12, 1]}
          />
        </g>
      </g>
    </>
  );
}
