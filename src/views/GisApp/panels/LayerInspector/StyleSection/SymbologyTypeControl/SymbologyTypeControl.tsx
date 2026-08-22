import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { AvailableSymbologyType } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.constants";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";

import { SymbologyOptions } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions";
import css from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyTypeControl/SymbologyTypeControl.module.css";
import { useSymbologyTypeChange } from "@/views/GisApp/panels/LayerInspector/StyleSection/useSymbologyTypeChange";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

function _isPointProducingBinding(layer: MapLayer.T): boolean {
  const binding = layer.geoBinding;
  return (
    (binding?.type === "latLngColumns" &&
      binding.latitude !== undefined &&
      binding.longitude !== undefined) ||
    (binding?.type === "geometryColumn" && binding.family === "point")
  );
}

/** Selects the layer's symbol type while retaining each type's settings. */
export function SymbologyTypeControl({
  layer,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const onTypeChange = useSymbologyTypeChange({ layer, onLayerChange });
  const labels = {
    circle: t`Point`,
    proportionalSymbol: t`Sized`,
    cluster: t`Cluster`,
    heatmap: t`Heat`,
  };
  const isDensityAvailable =
    layer.sensitivity.mode !== "aggregateOnly" &&
    _isPointProducingBinding(layer);
  const isOptionAvailable = (type: AvailableSymbologyType): boolean => {
    if (layer.sensitivity.mode === "aggregateOnly") {
      return false;
    }
    return type === "cluster" || type === "heatmap" ? isDensityAvailable : true;
  };
  const hint =
    layer.sensitivity.mode === "aggregateOnly"
      ? t`Aggregate-only layers require an area-producing binding.`
      : !isDensityAvailable
        ? t`Cluster and Heat require a complete point-producing binding.`
        : undefined;
  return (
    <div>
      <Text component="span" size="xs" fw={500} id="gis-symbology-label">
        {t`Symbol`}
      </Text>
      <div
        className={css.symbologyTypeControlGroup}
        role="group"
        aria-labelledby="gis-symbology-label"
      >
        <SymbologyOptions
          activeType={layer.symbology.type}
          labels={labels}
          isOptionAvailable={isOptionAvailable}
          onTypeChange={onTypeChange}
        />
      </div>
      {hint ? (
        <Text component="p" size="xs" c="dimmed" id="gis-symbology-hint">
          {hint}
        </Text>
      ) : null}
    </div>
  );
}
