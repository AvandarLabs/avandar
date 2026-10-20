import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./UtteranceToModelDraft.schema";
import type { ReactNode } from "react";
type Props = { frame: number; input: Input; accent: string };
/** Review copy and acceptance reflect only the supplied human decision. */
export function DraftReview({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g opacity={ramp(frame, 106, 29)}>
      <LabelSlots
        labels={[
          [input.review.reviewerLabel, 60, 515, 400, 12, 3],
          [input.review.note, 480, 515, 420, 12, 3],
          [
            input.review.outcome === "accept"
              ? input.copy.accepted
              : input.copy.pending,
            60,
            565,
            810,
            12,
            2,
          ],
        ]}
      />
      {input.review.outcome === "accept" ? (
        <path
          data-acceptance="true"
          d="M875 560 L883 568 L901 548"
          fill="none"
          stroke={accent}
          strokeWidth={3}
        />
      ) : undefined}
    </g>
  );
}
