import { SketchedShape } from "../../../primitives/SketchedShape";
import type { usePhysicalReadingBookPresentation } from "./usePhysicalReadingBookPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof usePhysicalReadingBookPresentation>,
  "pageTurn" | "book" | "tokens" | "accent"
>;
/** Render the reading book page turn. */
export function ReadingBookPageTurn(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.pageTurn > 0 && props.pageTurn < 1 ? (
        <g data-page-turn={props.book.id}>
          <SketchedShape
            shape={{
              kind: "path",
              d: `M0 -15 L${(1 - 2 * props.pageTurn) * 34} -21 V14 L0 21 Z`,
            }}
            profile={props.tokens.sketch.shape}
            fill={props.tokens.color.accentAlt}
            stroke={props.accent}
          />
        </g>
      ) : undefined}
    </>
  );
}
