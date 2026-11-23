import { FeedbackNote } from "./FeedbackNote";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./FeedbackRefinement.schema";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & {
  input: Input;
};

type Props = Pick<ParentProps, "input" | "frame">;

/** Renders the review notes in authored paint order. */
export function ReviewNotes({ input, frame }: Readonly<Props>): ReactNode {
  return input.rounds.map((round, index) => {
    return (
      <FeedbackNote
        key={round.draft}
        frame={frame}
        round={round}
        index={index}
        numRounds={input.rounds.length}
        showReviewTrail={input.showReviewTrail}
      />
    );
  });
}
