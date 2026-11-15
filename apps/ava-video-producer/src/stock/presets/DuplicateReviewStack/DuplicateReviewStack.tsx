import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { DuplicateGroup } from "./DuplicateGroup";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./DuplicateReviewStack.schema";
import type { ReactNode } from "react";
/** Frame, theme and complete validated authored input. */
export type Props = GraphicProps & { input: Input };
/** Candidate records align by comparison data before explicit retention. */
export function DuplicateReviewStack({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 12, 20)}>
      <FitText
        text={input.title}
        x={44}
        y={50}
        width={872}
        fontSize={24}
        maxLines={2}
        breakLongWords
        normalizeWhitespace
      />
      <FitText
        text={input.comparisonFieldLabel}
        x={44}
        y={110}
        width={872}
        fontSize={14}
        maxLines={1}
        breakLongWords
        normalizeWhitespace
      />
      {input.groups.map((group, groupIndex) => (
        <DuplicateGroup
          key={group.id}
          frame={frame}
          input={input}
          group={group}
          groupIndex={groupIndex}
          accent={accent}
        />
      ))}
    </g>
  );
}
