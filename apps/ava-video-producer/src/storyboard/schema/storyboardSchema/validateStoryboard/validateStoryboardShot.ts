import { match, P } from "ts-pattern";
import { StoryboardValidation } from "../StoryboardValidation";
import { validateAvandarShot } from "./validateAvandarShot";
import { validateContinuityShot } from "./validateContinuityShot";
import { validateFlowchartShot } from "./validateFlowchartShot";
import { validateGraphShot } from "./validateGraphShot";
import { validateMediaShot } from "./validateMediaShot";
import { validateTiltedWindowShot } from "./validateTiltedWindowShot";
import { validateTitleShot } from "./validateTitleShot";
import { validateTypographyShot } from "./validateTypographyShot";
import type {
  StoryboardIssue,
  StoryboardPlan,
  StoryboardShot,
} from "./storyboardValidation.types";

function _checkScene({
  plan,
  shot: sourceShot,
  issue,
}: Readonly<{
  plan: Readonly<StoryboardPlan>;
  shot: StoryboardShot;
  issue: StoryboardIssue;
}>): void {
  match(sourceShot)
    .with({ scene: "continuity" }, (shot) => {
      return validateContinuityShot({ plan, shot, issue });
    })
    .with({ scene: "avandar" }, (shot) => {
      return validateAvandarShot({ plan, shot, issue });
    })
    .with({ scene: "typography" }, (shot) => {
      return validateTypographyShot({ shot: shot, issue: issue });
    })
    .with({ scene: "tilted-window" }, (shot) => {
      return validateTiltedWindowShot({ shot: shot, issue: issue });
    })
    .with({ scene: "title" }, (shot) => {
      return validateTitleShot({ shot: shot, issue: issue });
    })
    .with({ scene: "graph" }, (shot) => {
      return validateGraphShot({ shot: shot, issue: issue });
    })
    .with({ scene: "flowchart" }, (shot) => {
      return validateFlowchartShot({ shot: shot, issue: issue });
    })
    .with({ scene: "media" }, (shot) => {
      return validateMediaShot({ shot: shot, issue: issue });
    })
    .with(
      { scene: P.union("bar-comparison", "brand-lockup", "metric", "stock") },
      () => {
        return undefined;
      },
    )
    .exhaustive();
}
/** Runs shared timing checks before the selected scene-specific checks. */
export function validateStoryboardShot({
  plan,
  shot,
  issue,
}: Readonly<{
  plan: Readonly<StoryboardPlan>;
  shot: StoryboardShot;
  issue: StoryboardIssue;
}>): void {
  if (shot.transitionInFrames >= shot.durationInFrames) {
    issue(`${shot.id}: transition must be shorter than the shot`);
  }
  StoryboardValidation.checkShotTransition({
    shot,
    isFirstShot: shot === plan.shots[0],
  }).forEach(issue);
  if (
    (shot.scene === "bar-comparison" || shot.scene === "brand-lockup") &&
    shot.props.exit &&
    shot.props.exit.atFrame >= shot.durationInFrames
  ) {
    issue(`${shot.id}: the exit must start inside the shot`);
  }
  _checkScene({ plan: plan, shot: shot, issue: issue });
}
