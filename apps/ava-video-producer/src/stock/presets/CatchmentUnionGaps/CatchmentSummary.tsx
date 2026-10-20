import { PlanarPolygon } from "../../geography/PlanarPolygon/PlanarPolygon";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";
/** Inputs for CatchmentSummary. */
type Props = { input: Input; accent: string };

/** Unique union membership and its complete denominator use the chosen unit. */
export function CatchmentSummary({ input }: Readonly<Props>): ReactNode {
  const denominator = input.households.reduce(
    (sum, home) => sum + (input.measure === "members" ? home.members : 1),
    0,
  );
  const covered = input.households
    .filter((home) =>
      input.catchments.some(
        ({ polygon }) =>
          PlanarPolygon.getPointClassification({
            point: [home.x, home.y],
            polygon,
          }) === "inside",
      ),
    )
    .reduce(
      (sum, home) => sum + (input.measure === "members" ? home.members : 1),
      0,
    );
  return (
    <g data-covered={covered} data-denominator={denominator}>
      <LabelSlots
        labels={[
          [input.copy.context, 40, 36, 880, 18, 2],
          [input.copy.covered, 40, 482, 290, 12, 3],
          [input.copy.uncovered, 350, 482, 290, 12, 3],
          [input.copy.total, 660, 482, 290, 12, 3],
          [String(covered), 40, 544, 100, 24, 1],
          [String(denominator - covered), 350, 544, 100, 24, 1],
          [String(denominator), 660, 544, 100, 24, 1],
          [input.copy[input.measure], 40, 461, 880, 12, 2],
          [input.copy.overlap, 40, 580, 880, 12, 1],
        ]}
      />
    </g>
  );
}
