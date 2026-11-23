import type {
  StoryboardIssue,
  StoryboardShot,
} from "./storyboardValidation.types";
/** Checks the authored title scene and reports its issues in order. */
export function validateTitleShot({
  shot,
  issue,
}: Readonly<{
  shot: Extract<StoryboardShot, { scene: "title" }>;
  issue: StoryboardIssue;
}>): void {
  if (shot.durationInFrames !== 66) {
    issue(`${shot.id}: existing TitleCard requires 66 frames`);
  }
}
