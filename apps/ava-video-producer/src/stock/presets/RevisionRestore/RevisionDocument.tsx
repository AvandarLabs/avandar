import { STOCK } from "../../stockPalette";
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
  return (
    <g
      data-current-content={content
        .filter((line) => line !== undefined)
        .join("|")}
      data-surface={input.surface}
    >
      <rect
        x={270}
        y={140}
        width={420}
        height={200}
        rx={input.surface === "page" ? 5 : 22}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
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
