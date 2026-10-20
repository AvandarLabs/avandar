import { STOCK } from "../../stockPalette";
import { getReadingLearnerFromInput } from "./getReadingLearnerFromInput";
import { getReadingSeatPathFromFrame } from "./getReadingSeatPathFromFrame";
import { ReadingPerson } from "./ReadingPerson";
import { ReadingRosterEntry } from "./ReadingRosterEntry";
import { SceneText } from "./SceneText";
import type { Input } from "./SharedReadingCircles.schema";
import type { ReactNode } from "react";
type Props = {
  input: Input;
  learner: Input["learners"][number];
  index: number;
  frame: number;
  accent: string;
};
/**
 * A stable roster member carries the group's copy or pivots into its circle.
 */
export function ReadingLearner({
  input,
  learner,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y, isCarrying, hasHand, handX, handY, bookId, seatAngle } =
    getReadingLearnerFromInput({
      input,
      learner,
      frame,
    });
  return (
    <g>
      <g
        data-reader-id={learner.id}
        data-reader-book={bookId}
        transform={`translate(${x} ${y})`}
      >
        <path
          data-reading-seat={learner.id}
          d={getReadingSeatPathFromFrame({ frame, angle: seatAngle })}
          fill="none"
          stroke={STOCK.line}
          strokeWidth={2}
        />
        <ReadingPerson
          learnerId={learner.id}
          accent={accent}
          isCarrying={isCarrying}
          hasHand={hasHand}
          handX={handX}
          handY={handY}
        />
        <SceneText
          text={String(index + 1)}
          color={STOCK.cyan}
          slot={[21, 0, 20, 12, 1]}
        />
      </g>
      <ReadingRosterEntry learner={learner} index={index} />
    </g>
  );
}
