import { SketchedShape } from "../../../primitives/SketchedShape";
import type { usePhysicalReadingBookPresentation } from "./usePhysicalReadingBookPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof usePhysicalReadingBookPresentation>,
  "book" | "halfWidth" | "tokens" | "accent" | "scales"
>;
/** Render the reading book cover. */
export function ReadingBookCover(props: Readonly<Props>): ReactNode {
  return (
    <g data-book-cover={props.book.id}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${-props.halfWidth} -19 H-3 L0 -14 L3 -19 H${props.halfWidth} V19 H3 L0 23 L-3 19 H${-props.halfWidth} Z`,
        }}
        profile={props.tokens.sketch.shape}
        fill={props.tokens.color.elevated}
        stroke={props.accent}
        strokeWidth={props.scales.stroke(props.tokens.stroke.default)}
      />
    </g>
  );
}
