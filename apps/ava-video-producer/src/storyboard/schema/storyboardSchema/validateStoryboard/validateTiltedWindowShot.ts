import { StoryboardValidation } from "../StoryboardValidation";
import type {
  StoryboardIssue,
  StoryboardShot,
} from "./storyboardValidation.types";
/** Checks the authored tilted-window scene and reports its issues in order. */
export function validateTiltedWindowShot({
  shot,
  issue,
}: Readonly<{
  shot: Extract<StoryboardShot, { scene: "tilted-window" }>;
  issue: StoryboardIssue;
}>): void {
  StoryboardValidation.checkTiltedWindow({
    props: shot.props,
    durationInFrames: shot.durationInFrames,
  }).forEach((message) => {
    return issue(`${shot.id}: ${message}`);
  });
}
