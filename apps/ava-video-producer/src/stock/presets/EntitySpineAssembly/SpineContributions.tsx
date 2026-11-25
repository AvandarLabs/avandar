import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getSpineContributionFromFrame } from "./getSpineContributionFromFrame";
import { SpineContributionsEntitiesLayer } from "./SpineContributionsEntitiesLayer/SpineContributionsEntitiesLayer";
import { SpineObservationContribution } from "./SpineObservationContribution/SpineObservationContribution";
import type { Input } from "./EntitySpineAssembly.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
  observations: Input["observations"];
  frame: number;
  accent: string;
};
/** Foreground stacks preserve numeric identities until each sum is attached. */
export function SpineContributions({
  input,
  observations,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  if (frame < 49 || frame >= 139) {
    return null;
  }
  return (
    <g data-spine-numeric-layer="foreground">
      {observations.map((observation, index) => {
        const isFirst =
          index === 0 ||
          observations[index - 1].entityId !== observation.entityId;
        const { groupStart } = getSpineContributionFromFrame({
          input,
          observation,
          index,
          frame,
          motion,
        });
        return (
          <SpineObservationContribution
            key={observation.id}
            {...{ observation, isFirst, frame, groupStart, input, index }}
            accent={accent}
          />
        );
      })}
      <SpineContributionsEntitiesLayer {...{ frame, input, observations }} />
    </g>
  );
}
