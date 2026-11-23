import { ContinuityTimeline } from "../../../../continuity/ContinuityTimeline/ContinuityTimeline";
import { CaptionLayout } from "../../../../scenes/layout/CaptionLayout";
import type {
  StoryboardIssue,
  StoryboardPlan,
  StoryboardShot,
} from "./storyboardValidation.types";
/** Checks the authored continuity scene and reports its issues in order. */
export function validateContinuityShot({
  plan,
  shot,
  issue,
}: Readonly<{
  plan: Readonly<StoryboardPlan>;
  shot: Extract<StoryboardShot, { scene: "continuity" }>;
  issue: StoryboardIssue;
}>): void {
  const stageHeight =
    plan.height -
    (plan.captions
      ? CaptionLayout.captionBand({
          cues: plan.narration,
          width: plan.width,
          height: plan.height,
        })
      : 0);
  if (plan.width !== 1600 || stageHeight !== 840) {
    issue(`${shot.id}: continuity requires the validated 1600 by 840 stage`);
  }
  try {
    const beats = ContinuityTimeline.getContinuityTimeline(shot.props.beats);
    if (beats[beats.length - 1].end !== shot.durationInFrames) {
      issue(
        `${shot.id}: continuity shot must contain the complete beat schedule`,
      );
    }
  } catch {
    issue(`${shot.id}: invalid continuity overlap`);
  }
}
