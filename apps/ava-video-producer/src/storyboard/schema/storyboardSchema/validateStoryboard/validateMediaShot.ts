import { prop } from "@avandar/utils";
import { checkUniqueStoryboardIds } from "./checkUniqueStoryboardIds";
import type {
  StoryboardIssue,
  StoryboardShot,
} from "./storyboardValidation.types";
/** Checks the authored media scene and reports its issues in order. */
export function validateMediaShot({
  shot,
  issue,
}: Readonly<{
  shot: Extract<StoryboardShot, { scene: "media" }>;
  issue: StoryboardIssue;
}>): void {
  const unique = ({
    ids,
    name,
  }: Readonly<{ ids: readonly string[]; name: string }>): void => {
    return checkUniqueStoryboardIds({ ids: ids, name: name, issue: issue });
  };
  const regions = [
    ...(shot.props.callouts ?? []),
    ...(shot.props.crop ? [shot.props.crop] : []),
  ];
  if (
    regions.some((r) => {
      return r.x + r.width > 1.000001 || r.y + r.height > 1.000001;
    })
  ) {
    issue(`${shot.id}: region extends beyond the source frame`);
  }
  unique({
    ids: (shot.props.callouts ?? []).map(prop("id")),
    name: `${shot.id} callout`,
  });
  (shot.props.callouts ?? []).forEach((item) => {
    if (
      item.endFrame <= item.startFrame ||
      item.endFrame > shot.durationInFrames
    ) {
      issue(`${shot.id}: invalid callout timing`);
    }
  });
}
