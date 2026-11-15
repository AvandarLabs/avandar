import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ReadingBook } from "./ReadingBook";
import { ReadingHeadings } from "./ReadingHeadings";
import { ReadingLearner } from "./ReadingLearner";
import { SceneText } from "./SceneText";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./SharedReadingCircles.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/**
 * Carries a conserved set of books into explicitly authored reading circles.
 */
export function SharedReadingCircles({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <ReadingHeadings input={input} />
      <path
        opacity={1 - ramp(frame, 94, 14)}
        data-reading-shelf={input.startingShelf}
        d={
          input.startingShelf === "front"
            ? "M65 275 H920 M75 275 V290 M910 275 V290"
            : "M65 228 V440 M65 275 H140 M65 330 H140 M65 385 H140 M65 440 H140"
        }
        fill="none"
        stroke={STOCK.line}
        strokeWidth={3}
      />
      {input.readingGroups.map((group, groupIndex) => (
        <ReadingBook
          key={group.bookId}
          input={input}
          groupIndex={groupIndex}
          frame={frame}
          accent={accent}
        />
      ))}
      {input.learners.map((learner, index) => (
        <ReadingLearner
          key={learner.id}
          learner={learner}
          index={index}
          input={input}
          frame={frame}
          accent={accent}
        />
      ))}
      <SceneText
        text={input.caption}
        anchor="middle"
        slot={[480, 580, 850, 14, 1]}
      />
    </g>
  );
}
