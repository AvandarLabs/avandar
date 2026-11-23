import { Text } from "../../../graphics-common/Text";
import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import type { Input } from "../BoundedLocationDisplacement.schema";
import type { ReactNode } from "react";

type Props = {
  input: Input;
};

/** Renders the approximate label with authored geometry. */
export function PublicDisplacementMapApproximateLabel({
  input,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.locations.map((location, index) => {
        return (
          <g key={location.id} data-approximate-label={location.id}>
            <Text x={485} y={440 + index * 52} role="data">
              {index + 1}·
            </Text>
            <LabelSlots
              labels={[
                [location.label, 510, 440 + index * 52, 165, 12, 3],
                [input.labels.approximate, 695, 440 + index * 52, 220, 12, 3],
              ]}
            />
          </g>
        );
      })}
    </>
  );
}
