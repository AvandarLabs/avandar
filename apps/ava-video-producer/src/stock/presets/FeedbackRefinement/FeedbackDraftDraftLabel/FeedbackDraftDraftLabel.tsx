import { FitText } from "../../../primitives/FitText/FitText";
import type { getFeedbackStateFromInputAndFrame } from "../getFeedbackStateFromInputAndFrame";
import type { ReactNode } from "react";

type Props = {
  clipId: string;
  round: ReturnType<typeof getFeedbackStateFromInputAndFrame>["round"];
  x: ReturnType<typeof getFeedbackStateFromInputAndFrame>["x"];
};

/** Renders the draft label with authored geometry. */
export function FeedbackDraftDraftLabel({
  clipId,
  round,
  x,
}: Readonly<Props>): ReactNode {
  return (
    <g clipPath={`url(#${clipId}-draft)`}>
      <FitText
        text={round.draft}
        x={x + 16}
        y={247}
        width={268}
        fontSize={18}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
    </g>
  );
}
