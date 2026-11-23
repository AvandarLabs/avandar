import { CaptionLayout } from "../../../../scenes/layout/CaptionLayout";
import type {
  StoryboardIssue,
  StoryboardPlan,
} from "./storyboardValidation.types";
/** Checks canvas size, caption space, and delivery aspect ratio. */
export function validateStoryboardDimensions({
  plan,
  issue,
}: Readonly<{ plan: Readonly<StoryboardPlan>; issue: StoryboardIssue }>): void {
  if (
    [plan.width, plan.height, plan.delivery.width, plan.delivery.height].some(
      (value) => {
        return value % 2;
      },
    )
  ) {
    issue("Canvas and delivery dimensions must be even");
  }
  if (plan.captions && plan.narration.length) {
    try {
      if (
        plan.height -
          CaptionLayout.captionBand({
            cues: plan.narration,
            width: plan.width,
            height: plan.height,
          }) <
        640
      ) {
        issue(
          "Captioned films need at least 640px scene height after reserving the tallest caption; increase canvas height or shorten the cues",
        );
      }
    } catch (error) {
      issue(
        error instanceof Error
          ? error.message
          : "Caption text cannot fit legibly",
      );
    }
  }
  if (plan.width * plan.delivery.height !== plan.height * plan.delivery.width) {
    issue("Delivery and canvas aspect ratios must match");
  }
}
