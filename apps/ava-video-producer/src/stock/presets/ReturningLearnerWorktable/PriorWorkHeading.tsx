import { SceneText } from "./SceneText";
import type { Input } from "./ReturningLearnerWorktable.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Draws the PriorWorkHeading group with fixed authored geometry. */
export function PriorWorkHeading({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const period =
    frame < 36
      ? input.periodLabels.before
      : frame < 72
        ? input.periodLabels.interruption
        : input.periodLabels.return;
  return (
    <>
      <SceneText text={period} anchor="middle" slot={[480, 45, 850, 18, 1]} />
      <SceneText
        text={input.activityLabels.retained}
        anchor="middle"
        slot={[480, 82, 850, 14, 1]}
      />
      {input.priorWork.map((work, index) => (
        <g key={work.id}>
          <SceneText
            text={String(index + 1)}
            color={accent}
            slot={[42 + index * 300, 123, 24, 14, 1]}
          />
          <SceneText
            text={work.label}
            anchor="middle"
            slot={[180 + index * 300, 123, 245, 14, 3]}
          />
        </g>
      ))}
    </>
  );
}
