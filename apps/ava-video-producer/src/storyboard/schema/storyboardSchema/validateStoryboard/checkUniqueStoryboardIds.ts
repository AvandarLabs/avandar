import type { StoryboardIssue } from "./storyboardValidation.types";
/** Reports duplicate identifiers without changing their source order. */
export function checkUniqueStoryboardIds({
  ids,
  name,
  issue,
}: Readonly<{
  ids: readonly string[];
  name: string;
  issue: StoryboardIssue;
}>): void {
  if (new Set(ids).size !== ids.length) {
    issue(`${name} IDs must be unique`);
  }
}
