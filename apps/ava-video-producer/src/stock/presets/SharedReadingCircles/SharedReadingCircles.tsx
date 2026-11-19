import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { ReadingBook } from "./ReadingBook";
import { ReadingHeadings } from "./ReadingHeadings";
import { ReadingLearner } from "./ReadingLearner";
import { SceneText } from "./SceneText";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
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
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const scales = useGraphicShapeScales();
  return (
    <g>
      <ReadingHeadings input={input} />
      <g data-reading-shelf={input.startingShelf}>
        <SketchedShape
          shape={{
            kind: "path",
            d:
              input.startingShelf === "front"
                ? "M65 275 H920 M75 275 V290 M910 275 V290"
                : "M65 228 V440 M65 275 H140 M65 330 H140 M65 385 H140 M65 440 H140",
          }}
          profile={tokens.sketch.shape}
          opacity={
            1 - motion.ramp(frame, 94, motion.scale(14), motion.exit.easing)
          }
          fill="none"
          stroke={tokens.color.line}
          strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        />
      </g>
      {input.readingGroups.map((group, groupIndex) => {
        return (
          <ReadingBook
            key={group.bookId}
            input={input}
            groupIndex={groupIndex}
            frame={frame}
            accent={accent}
          />
        );
      })}
      {input.learners.map((learner, index) => {
        return (
          <ReadingLearner
            key={learner.id}
            learner={learner}
            index={index}
            input={input}
            frame={frame}
            accent={accent}
          />
        );
      })}
      <SceneText
        text={input.caption}
        anchor="middle"
        slot={[480, 580, 850, 14, 1]}
      />
    </g>
  );
}
