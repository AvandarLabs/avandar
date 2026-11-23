import { ReadingBook } from "./ReadingBook/ReadingBook";
import { ReadingHeadings } from "./ReadingHeadings";
import { ReadingLearner } from "./ReadingLearner/ReadingLearner";
import { ReadingShelf } from "./ReadingShelf";
import { SceneText } from "./SceneText";
import { useSharedReadingCirclesPresentation } from "./useSharedReadingCirclesPresentation";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SharedReadingCircles.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * Carries a conserved set of books into explicitly authored reading circles.
 */
export function SharedReadingCircles(props: Readonly<Props>): ReactNode {
  const presentation = useSharedReadingCirclesPresentation(props);

  return (
    <g>
      <ReadingHeadings input={props.input} />
      <ReadingShelf {...presentation} />
      {props.input.readingGroups.map((group, groupIndex) => {
        return (
          <ReadingBook
            key={group.bookId}
            input={props.input}
            groupIndex={groupIndex}
            frame={props.frame}
            accent={props.accent}
          />
        );
      })}
      {props.input.learners.map((learner, index) => {
        return (
          <ReadingLearner
            key={learner.id}
            learner={learner}
            index={index}
            input={props.input}
            frame={props.frame}
            accent={props.accent}
          />
        );
      })}
      <SceneText
        text={props.input.caption}
        anchor="middle"
        slot={[480, 580, 850, 14, 1]}
      />
    </g>
  );
}
