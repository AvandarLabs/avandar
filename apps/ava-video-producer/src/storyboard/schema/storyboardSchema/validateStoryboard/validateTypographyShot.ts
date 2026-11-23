import type {
  StoryboardIssue,
  StoryboardShot,
} from "./storyboardValidation.types";
/** Checks the authored typography scene and reports its issues in order. */
export function validateTypographyShot({
  shot,
  issue,
}: Readonly<{
  shot: Extract<StoryboardShot, { scene: "typography" }>;
  issue: StoryboardIssue;
}>): void {
  if (shot.props.size === "caption" && shot.props.fontSize !== undefined) {
    issue(`${shot.id}: a caption size sets its own font size`);
  }
  if (shot.props.exit && shot.props.exit.atFrame >= shot.durationInFrames) {
    issue(`${shot.id}: the exit must start inside the shot`);
  }
}
