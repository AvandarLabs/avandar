import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type GeometryBinding = Extract<MapLayer.GeoBinding, { type: "geometryColumn" }>;

type Props = {
  binding: GeometryBinding;
  onLayerChange: LayerChangeHandler;
};

/** Edits screen-space geometry simplification for lines and polygons. */
export function SimplificationControls(props: Props): ReactNode {
  const { t } = useLingui();
  if (props.binding.family === "point") {
    return null;
  }
  return (
    <details>
      <summary>{t`Advanced geometry settings`}</summary>
      <NumberInput
        label={t`Simplification tolerance`}
        description={t`Pixels of detail to remove at the current zoom. Set to zero to disable simplification.`}
        min={0}
        step={0.05}
        value={props.binding.simplification?.tolerancePixels ?? 0}
        onChange={(value) => {
          const tolerancePixels = typeof value === "number" ? value : 0;
          props.onLayerChange((current) => {
            return MapLayerUpdates.withGeometrySimplification(
              current,
              tolerancePixels === 0 ? undefined : { tolerancePixels },
            );
          });
        }}
      />
    </details>
  );
}
