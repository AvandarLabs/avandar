import { StockRect } from "../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RevisionCurrentLines } from "./RevisionCurrentLines";
import type { Input } from "./RevisionRestore.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  content: Array<string | undefined>;
  previous: string[];
  selected: string[];
  frame: number;
  accent: string;
};
/** A page document's corner, before the theme's corner style. */
const PAGE_CORNER = 5;
/** A canvas document's corner, before the theme's corner style. */
const CANVAS_CORNER = 22;
/**
 * The current document replaces positional lines and removes change notches.
 */
export function RevisionDocument({
  input,
  content,
  previous,
  selected,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g
      data-current-content={content
        .filter((line) => {
          return line !== undefined;
        })
        .join("|")}
      data-surface={input.surface}
    >
      <StockRect
        x={270}
        y={140}
        width={420}
        height={200}
        rx={scales.corner(
          input.surface === "page" ? PAGE_CORNER : CANVAS_CORNER,
        )}
        fill={tokens.color.surface}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      <RevisionCurrentLines
        input={input}
        content={content}
        previous={previous}
        selected={selected}
        frame={frame}
      />
    </g>
  );
}
