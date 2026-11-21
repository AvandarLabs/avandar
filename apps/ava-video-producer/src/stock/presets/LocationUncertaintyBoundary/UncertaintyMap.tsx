import { propEq } from "@avandar/utils";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DistrictFootprint } from "./DistrictFootprint";
import { getAssignmentsFromLocations } from "./getAssignmentsFromLocations";
import { UncertaintyMapLocationsLayer } from "./UncertaintyMapLocationsLayer/UncertaintyMapLocationsLayer";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** Nominal locations stay fixed while their complete supplied disks expand. */
export function UncertaintyMap({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const focus = getAssignmentsFromLocations(input).find(
    propEq("id", input.focusedLocationId),
  )!;
  return (
    <g>
      <StockRect
        x={50}
        y={140}
        width={360}
        height={360}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      {input.districts.map((district, index) => {
        // The schema bounds districts to four. Creating a Set for
        // this frame costs more than these bounded array lookups.
        // react-doctor-disable-next-line js-set-map-lookups
        const isPossible = focus.possible.includes(index);
        return (
          <DistrictFootprint
            key={district.id}
            {...{ district, index, frame, isPossible, accent }}
          />
        );
      })}
      <UncertaintyMapLocationsLayer {...{ input, frame, accent }} />
    </g>
  );
}
