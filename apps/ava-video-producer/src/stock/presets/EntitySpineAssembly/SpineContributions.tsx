import { LiteralDataText } from "../../primitives/LiteralDataText/LiteralDataText";
import { getSpineContributionFromFrame } from "./getSpineContributionFromFrame";
import { SpineContribution } from "./SpineContribution";
import { SpineSum } from "./SpineSum";
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
        });
        return (
          <g key={observation.id}>
            {isFirst && frame >= 82 && frame < 106 ? (
              <LiteralDataText
                value={observation.entityId}
                x={235}
                y={groupStart + 14}
              />
            ) : null}
            {frame < 105 ? (
              <SpineContribution
                input={input}
                observation={observation}
                index={index}
                frame={frame}
                accent={accent}
              />
            ) : null}
          </g>
        );
      })}
      {frame >= 100
        ? input.entities.map((entity) => {
            const index = observations.findIndex(
              ({ entityId }) => entityId === entity.id,
            );
            return index >= 0 ? (
              <SpineSum
                key={entity.id}
                input={input}
                observation={observations[index]}
                index={index}
                frame={frame}
              />
            ) : null;
          })
        : null}
    </g>
  );
}
