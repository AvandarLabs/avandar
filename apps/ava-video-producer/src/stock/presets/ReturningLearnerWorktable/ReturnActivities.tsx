import { ReturnActivity } from "./ReturnActivity/ReturnActivity";
import type { useReturningLearnerWorktablePresentation } from "./useReturningLearnerWorktablePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useReturningLearnerWorktablePresentation>,
  "input" | "frame" | "accent"
>;

/** Render the return activities. */
export function ReturnActivities(props: Readonly<Props>): ReactNode {
  return (
    <>
      {props.input.returnActivities.map((activity, index) => {
        return (
          <ReturnActivity
            key={activity.id}
            activity={activity}
            index={index}
            input={props.input}
            frame={props.frame}
            accent={props.accent}
          />
        );
      })}
    </>
  );
}
