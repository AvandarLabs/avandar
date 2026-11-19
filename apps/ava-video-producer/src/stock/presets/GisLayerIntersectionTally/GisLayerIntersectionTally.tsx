import { PlanarPolygon } from "../../geography/PlanarPolygon/PlanarPolygon";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { GisLabels } from "./GisLabels";
import { HouseholdMarker } from "./HouseholdMarker";
import { LayerGeometry } from "./LayerGeometry";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./GisLayerIntersectionTally.schema";
import type { ReactNode } from "react";

function _isSelected({
  input,
  household,
}: Readonly<{
  input: Input;
  household: Input["households"][number];
}>): boolean {
  const point: [number, number] = [household.x, household.y];
  const first =
    PlanarPolygon.getPointClassification({
      point,
      polygon: input.layers[0].polygon,
    }) === "inside";
  const second =
    PlanarPolygon.getPointClassification({
      point,
      polygon: input.layers[1].polygon,
    }) === "inside";
  return first && (input.operation === "intersection" ? second : !second);
}
/** Inputs for GisLayerIntersectionTally. */
type Props = GraphicProps & { input: Input };

/**
 * Register geometric layers, preserve records and tally the chosen set measure.
 */
export function GisLayerIntersectionTally({
  frame,
  accent,
  input,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const selected = input.households.map((household) => {
    return _isSelected({ input, household });
  });
  const quantity = (household: Input["households"][number]) => {
    return input.measure === "members" ? household.members : 1;
  };
  const totalQuantity = input.households.reduce((total, household) => {
    return total + quantity(household);
  }, 0);
  const selectedQuantity = input.households.reduce(
    (total, household, index) => {
      return total + (selected[index] ? quantity(household) : 0);
    },
    0,
  );
  return (
    <g>
      <LayerGeometry input={input} frame={frame} accent={accent} />
      <SketchedShape
        shape={{ kind: "path", d: "M565 155 H555 V510 H565" }}
        profile={tokens.sketch.shape}
        data-counting-bracket="true"
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
      {input.households.map((household, index) => {
        return (
          <HouseholdMarker
            key={household.id}
            household={household}
            index={index}
            frame={frame}
            isSelected={selected[index]}
            accent={accent}
          />
        );
      })}
      <GisLabels
        input={input}
        selectedQuantity={selectedQuantity}
        totalQuantity={totalQuantity}
        frame={frame}
      />
    </g>
  );
}
