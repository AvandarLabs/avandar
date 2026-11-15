import { STOCK } from "../../stockPalette";
import { SceneText } from "./SceneText";
import type { Input } from "./TeacherLearningCover.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Draws the scene's MentorBoard group with fixed authored geometry. */
export function MentorBoard({ input, frame }: Readonly<Props>): ReactNode {
  const phase =
    frame < 48
      ? input.phaseLabels.cover
      : frame < 104
        ? input.phaseLabels.support
        : input.phaseLabels.return;
  return (
    <>
      <rect
        data-teaching-board="true"
        x={592}
        y={300}
        width={316}
        height={118}
        rx={4}
        fill={STOCK.surface}
        stroke={STOCK.line}
        strokeWidth={2}
      />
      <SceneText
        text={input.session.prompt}
        anchor="middle"
        slot={[750, 331, 284, 16, 4]}
      />
      <SceneText
        text={input.session.label}
        anchor="middle"
        slot={[750, 450, 320, 14, 3]}
      />
      <SceneText text={phase} anchor="middle" slot={[750, 510, 320, 14, 3]} />
      <SceneText
        text={input.caption}
        anchor="middle"
        slot={[480, 580, 850, 14, 1]}
      />
    </>
  );
}
