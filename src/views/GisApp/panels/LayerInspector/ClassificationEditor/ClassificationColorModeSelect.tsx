import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { GraduatedRamps } from "@/views/GisApp/layers/GraduatedRamps/GraduatedRamps";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { withQueryColumn } from "@/views/GisApp/layers/MapLayerUpdates/withQueryColumn";
import { getNumericLayerColumns } from "@/views/GisApp/panels/LayerInspector/ClassificationEditor/getNumericLayerColumns";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  colorType: MapLayer.Color["type"];
  onLayerChange: LayerChangeHandler;
};

type ColorMode = "single" | "categorical" | "graduated";
type ClassifiedColor = Exclude<MapLayer.Color, { type: "single" }>;
type CreatedColor = {
  color: MapLayer.Color;
  column: QueryColumn.T | undefined;
};

function _getDefaultValue(layer: MapLayer.T):
  | {
      value: MapLayer.LayerValue;
      column: QueryColumn.T | undefined;
    }
  | undefined {
  const binding = layer.geoBinding;
  if (
    binding?.type === "joinToBoundaries" ||
    binding?.type === "aggregatePointsToBoundaries" ||
    binding?.type === "binPointsToGrid"
  ) {
    return {
      value: {
        type: "areaAggregation",
        outputValueId: binding.aggregation.outputValueId,
      },
      column: undefined,
    };
  }
  const column = getNumericLayerColumns(layer)[0];
  return column
    ? { value: { type: "queryColumn", column: column.id }, column }
    : undefined;
}

function _makeGraduatedColor(
  value: MapLayer.LayerValue,
  column: QueryColumn.T | undefined,
  noData: ClassifiedColor["noData"],
): CreatedColor {
  return {
    column,
    color: {
      type: "graduated",
      value,
      ramp: GraduatedRamps.presets.blue,
      classification: { method: "quantile", classCount: 5 },
      normalization: undefined,
      noData,
      classLabels: Array.from({ length: 5 }, () => {
        return undefined;
      }),
    },
  };
}

function _makeCategoricalColor(
  value: MapLayer.LayerValue,
  column: QueryColumn.T | undefined,
  noData: ClassifiedColor["noData"],
): CreatedColor {
  return {
    column,
    color: {
      type: "categorical",
      value,
      categories: [
        { value: "", label: "", color: "#2171b5" },
        { value: "", label: "", color: "#f16913" },
        { value: "", label: "", color: "#31a354" },
      ],
      other: { color: "#969696", label: "" },
      noData,
    },
  };
}

function _createColor(
  layer: MapLayer.T,
  mode: ColorMode,
): CreatedColor | undefined {
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
    return {
      color: { type: "single", color: color ?? "#228be6" },
      column: undefined,
    };
  }
  const defaults = current.type === mode ? undefined : _getDefaultValue(layer);
  const value = current.type === mode ? current.value : defaults?.value;
  if (!value) {
    return undefined;
  }
  const noData =
    current.type === "single"
      ? { color: "#ced4da", label: "" }
      : current.noData;
  return mode === "graduated"
    ? _makeGraduatedColor(value, defaults?.column, noData)
    : _makeCategoricalColor(value, defaults?.column, noData);
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
            const withColumn = nextColor.column
              ? withQueryColumn({ layer: current, column: nextColor.column })
              : current;
            return MapLayerUpdates.withLayerColor({
              layer: withColumn,
              color: nextColor.color,
            });
          });
        }
      }}
    />
  );
}
