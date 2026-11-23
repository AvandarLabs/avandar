import { PortfolioCarrier } from "./PortfolioCarrier";
import { PriorWorkHeading } from "./PriorWorkHeading";
import { PriorWorkSample } from "./PriorWorkSample";
import { ReturnActivities } from "./ReturnActivities";
import { ReturningTeacher } from "./ReturningTeacher";
import { ReturnWorktables } from "./ReturnWorktables";
import { SceneText } from "./SceneText";
import { useReturningLearnerWorktablePresentation } from "./useReturningLearnerWorktablePresentation";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./ReturningLearnerWorktable.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };
/** Carries the same portfolio through absence, return and teacher additions. */
export function ReturningLearnerWorktable(props: Readonly<Props>): ReactNode {
  const presentation = useReturningLearnerWorktablePresentation(props);

  return (
    <g>
      <PriorWorkHeading
        input={props.input}
        frame={props.frame}
        accent={props.accent}
      />
      <ReturnWorktables
        showPortfolioTrail={props.input.showPortfolioTrail}
        accent={props.accent}
      />
      <PortfolioCarrier
        input={props.input}
        portfolioOffset={presentation.portfolioOffset}
        accent={props.accent}
      />
      {props.input.priorWork.map((work, index) => {
        return (
          <PriorWorkSample
            key={work.id}
            work={work}
            index={index}
            offset={presentation.portfolioOffset}
            accent={props.accent}
          />
        );
      })}
      <ReturningTeacher
        input={props.input}
        teacherX={presentation.teacherX}
        handX={presentation.handX}
      />
      <ReturnActivities {...presentation} />
      <SceneText
        text={props.input.caption}
        anchor="middle"
        slot={[480, 579, 850, 14, 1]}
      />
    </g>
  );
}
