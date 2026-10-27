import { PlanarPolygon } from "../../geography/PlanarPolygon/PlanarPolygon";
import { HouseholdRecord } from "./HouseholdRecord";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";
type Props = { input: Input; progress: number; accent: string };
/**
 * Individually keyed homes remain visible even when coordinate anchors
 * coincide.
 */
export function CatchmentRoster({
  input,
  progress,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.households.map((household, index) => (
        <HouseholdRecord
          key={household.id}
          household={household}
          index={index}
          progress={progress}
          accent={accent}
          gapEmphasis={input.gapEmphasis}
          covered={input.catchments.some(
            ({ polygon }) =>
              PlanarPolygon.getPointClassification({
                point: [household.x, household.y],
                polygon,
              }) === "inside",
          )}
        />
      ))}
    </g>
  );
}
