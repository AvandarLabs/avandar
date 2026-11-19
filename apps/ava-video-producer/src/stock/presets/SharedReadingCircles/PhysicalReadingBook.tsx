import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  const book = { id: bookId };
  const opening = motion.ramp(
    frame,
    94,
    motion.scale(14),
    motion.entrance.easing,
  );
  const halfWidth = 22 + 18 * opening;
  const pageTurn = motion.ramp(
    frame,
    116,
    motion.scale(16),
    motion.entrance.easing,
  );
  return (
    <>
      <g data-book-id={book.id} transform={`translate(${bookX} ${bookY})`}>
        <g data-book-cover={book.id}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M${-halfWidth} -19 H-3 L0 -14 L3 -19 H${halfWidth} V19 H3 L0 23 L-3 19 H${-halfWidth} Z`,
            }}
            profile={tokens.sketch.shape}
            fill={tokens.color.elevated}
            stroke={accent}
            strokeWidth={scales.stroke(tokens.stroke.default)}
          />
        </g>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M0 -14 V23 M${-halfWidth + 6} -7 H-7 M7 -7 H${halfWidth - 6} M${-halfWidth + 6} 3 H-7 M7 3 H${halfWidth - 6}`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={accent}
          strokeOpacity={opening}
        />
        {pageTurn > 0 && pageTurn < 1 ? (
          <g data-page-turn={book.id}>
            <SketchedShape
              shape={{
                kind: "path",
                d: `M0 -15 L${(1 - 2 * pageTurn) * 34} -21 V14 L0 21 Z`,
              }}
              profile={tokens.sketch.shape}
              fill={tokens.color.accentAlt}
              stroke={accent}
            />
          </g>
        ) : undefined}
        <g data-book-key={book.id}>
          <SketchedShape
            shape={{ kind: "circle", cx: 0, cy: 0, r: 10 }}
            profile={tokens.sketch.shape}
            fill={tokens.color.surface}
            stroke={accent}
          />
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
