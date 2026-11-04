import { getReturnSceneFromFrame } from "./getReturnSceneFromFrame";
import { PortfolioCarrier } from "./PortfolioCarrier";
import { PriorWorkHeading } from "./PriorWorkHeading";
import { PriorWorkSample } from "./PriorWorkSample";
import { ReturnActivity } from "./ReturnActivity";
import { ReturningTeacher } from "./ReturningTeacher";
import { ReturnWorktables } from "./ReturnWorktables";
import { SceneText } from "./SceneText";
import type { GraphicProps } from "../../graphics-common";
import type { Input } from "./ReturningLearnerWorktable.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Carries the same portfolio through absence, return and teacher additions. */
export function ReturningLearnerWorktable({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const { portfolioOffset, teacherX, handX } = getReturnSceneFromFrame({
    frame,
    numActivities: input.returnActivities.length,
  });
  return (
    <g>
      <PriorWorkHeading input={input} frame={frame} accent={accent} />
      <ReturnWorktables
        showPortfolioTrail={input.showPortfolioTrail}
        accent={accent}
      />
      <PortfolioCarrier
        input={input}
        portfolioOffset={portfolioOffset}
        accent={accent}
      />
      {input.priorWork.map((work, index) => (
        <PriorWorkSample
          key={work.id}
          work={work}
          index={index}
          offset={portfolioOffset}
          accent={accent}
        />
      ))}
      <ReturningTeacher input={input} teacherX={teacherX} handX={handX} />
      {input.returnActivities.map((activity, index) => (
        <ReturnActivity
          key={activity.id}
          activity={activity}
          index={index}
          input={input}
          frame={frame}
          accent={accent}
        />
      ))}
      <SceneText
        text={input.caption}
        anchor="middle"
        slot={[480, 579, 850, 14, 1]}
      />
    </g>
  );
}
