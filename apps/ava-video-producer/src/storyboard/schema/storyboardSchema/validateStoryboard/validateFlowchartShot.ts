import { prop } from "@avandar/utils";
import { checkUniqueStoryboardIds } from "./checkUniqueStoryboardIds";
import type {
  StoryboardIssue,
  StoryboardShot,
} from "./storyboardValidation.types";
/** Checks the authored flowchart scene and reports its issues in order. */
export function validateFlowchartShot({
  shot,
  issue,
}: Readonly<{
  shot: Extract<StoryboardShot, { scene: "flowchart" }>;
  issue: StoryboardIssue;
}>): void {
  const unique = ({
    ids,
    name,
  }: Readonly<{ ids: readonly string[]; name: string }>): void => {
    return checkUniqueStoryboardIds({ ids: ids, name: name, issue: issue });
  };
  unique({ ids: shot.props.steps.map(prop("id")), name: `${shot.id} step` });
  const ids = new Set(shot.props.steps.map(prop("id")));
  shot.props.connectors.forEach((edge) => {
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) {
      issue(`${shot.id}: connector references an unknown step or itself`);
    }
  });
  if (shot.props.activeStep && !ids.has(shot.props.activeStep)) {
    issue(`${shot.id}: unknown active step`);
  }
  const times = shot.props.stepAtFrames;
  if (
    times &&
    (times.length !== shot.props.steps.length ||
      times.some((at, index) => {
        return (
          at >= shot.durationInFrames || (index > 0 && at <= times[index - 1])
        );
      }))
  ) {
    issue(`${shot.id}: invalid step timing`);
  }
}
