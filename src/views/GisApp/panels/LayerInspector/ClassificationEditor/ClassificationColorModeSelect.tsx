import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";

import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { GRADUATED_RAMPS } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/GraduatedControls/GraduatedControls.constants";

type Props = {
  layer: MapLayer.T;
  colorType: MapLayer.Color["type"];
  onLayerChange: LayerChangeHandler;
};

type ColorMode = "single" | "categorical" | "graduated";

function _getDefaultValue(layer: MapLayer.T): MapLayer.LayerValue | undefined {
  const binding = layer.geoBinding;
  if (
    binding?.type === "joinToBoundaries" ||
    binding?.type === "aggregatePointsToBoundaries" ||
    binding?.type === "binPointsToGrid"
  ) {
    return {
      type: "areaAggregation",
      outputValueId: binding.aggregation.outputValueId,
    };
  }
  const column = layer.source.queryColumns.find(QueryColumn.isNumeric);
  return column ? { type: "queryColumn", column: column.id } : undefined;
}

function _createColor(
  layer: MapLayer.T,
  mode: ColorMode,
): MapLayer.Color | undefined {
  if (layer.symbology.type === "heatmap") {
    return undefined;
  }
  const current = layer.symbology.color;
  if (mode === "single") {
    const color =
      current.type === "single"
        ? current.color
        : current.type === "graduated"
          ? current.ramp[0]
          : current.categories[0]?.color;
    return { type: "single", color: color ?? "#228be6" };
  }
  const value = current.type === mode ? current.value : _getDefaultValue(layer);
  if (!value) {
    return undefined;
  }
  const noData =
    current.type === "single"
      ? { color: "#ced4da", label: "" }
      : current.noData;
  if (mode === "graduated") {
    return {
      type: "graduated",
      value,
      ramp: GRADUATED_RAMPS.blue,
      classification: { method: "quantile", classCount: 5 },
      normalization: undefined,
      noData,
    };
  }
  return {
    type: "categorical",
    value,
    categories: [
      { value: "", label: "", color: "#2171b5" },
      { value: "", label: "", color: "#f16913" },
      { value: "", label: "", color: "#31a354" },
    ],
    other: { color: "#969696", label: "" },
    noData,
  };
}

function _isColorMode(value: string | null): value is ColorMode {
  return value === "single" || value === "categorical" || value === "graduated";
}

/** Switches the layer between single, categorical, and graduated color. */
export function ClassificationColorModeSelect({
  layer,
  colorType,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      label={t`Color mode`}
      data={[
        { value: "single", label: t`Single color` },
        { value: "categorical", label: t`Categories` },
        { value: "graduated", label: t`Graduated` },
      ]}
      value={colorType}
      allowDeselect={false}
      onChange={(mode) => {
        if (!_isColorMode(mode)) {
          return;
        }
        const nextColor = _createColor(layer, mode);
        if (nextColor) {
          onLayerChange((current) => {
            return MapLayerUpdates.withLayerColor({
              layer: current,
              color: nextColor,
            });
          });
        }
      }}
    />
  );
}
