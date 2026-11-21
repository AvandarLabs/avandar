import { HouseholdMarker } from "../HouseholdMarker/HouseholdMarker";
import type {
  GisLayerIntersectionTally,
  GisLayerIntersectionTallyIsSelectedCallable,
} from "../GisLayerIntersectionTally";
import type { ReactNode } from "react";

type Props = {
  input: Parameters<typeof GisLayerIntersectionTally>[0]["input"];
  frame: Parameters<typeof GisLayerIntersectionTally>[0]["frame"];
  selected: Array<ReturnType<GisLayerIntersectionTallyIsSelectedCallable>>;
  accent: Parameters<typeof GisLayerIntersectionTally>[0]["accent"];
};

/** Renders the households layer with authored geometry. */
export function GisLayerIntersectionTallyHouseholdsLayer({
  input,
  frame,
  selected,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.households.map((household, index) => {
        return (
          <HouseholdMarker
            key={household.id}
            {...{ household, index, frame }}
            isSelected={selected[index]}
            accent={accent}
          />
        );
      })}
    </>
  );
}
