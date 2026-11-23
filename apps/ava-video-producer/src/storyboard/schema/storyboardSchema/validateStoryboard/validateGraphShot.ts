import { prop } from "@avandar/utils";
import { checkUniqueStoryboardIds } from "./checkUniqueStoryboardIds";
import type {
  StoryboardIssue,
  StoryboardShot,
} from "./storyboardValidation.types";
/** Checks the authored graph scene and reports its issues in order. */
export function validateGraphShot({
  shot,
  issue,
}: Readonly<{
  shot: Extract<StoryboardShot, { scene: "graph" }>;
  issue: StoryboardIssue;
}>): void {
  const unique = ({
    ids,
    name,
  }: Readonly<{ ids: readonly string[]; name: string }>): void => {
    return checkUniqueStoryboardIds({ ids: ids, name: name, issue: issue });
  };
  unique({ ids: shot.props.nodes.map(prop("id")), name: `${shot.id} node` });
  unique({ ids: shot.props.edges.map(prop("id")), name: `${shot.id} edge` });
  const ids = new Set(shot.props.nodes.map(prop("id")));
  shot.props.edges.forEach((edge) => {
    if (!ids.has(edge.from) || !ids.has(edge.to) || edge.from === edge.to) {
      issue(`${shot.id}: edge references an unknown node or itself`);
    }
  });
  let previous = -1;
  (shot.props.traversal ?? []).forEach((item) => {
    if (
      !ids.has(item.nodeId) ||
      item.atFrame >= shot.durationInFrames ||
      item.atFrame <= previous
    ) {
      issue(`${shot.id}: invalid graph traversal`);
    }
    previous = item.atFrame;
  });
}
