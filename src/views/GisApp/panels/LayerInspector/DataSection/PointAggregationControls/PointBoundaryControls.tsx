import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { BoundaryColumnControls } from "@/views/GisApp/panels/LayerInspector/DataSection/PointAggregationControls/BoundaryColumnControls";
import type { BoundarySourceOption } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

type PointAggregationBinding = Extract<
  MapLayer.GeoBinding,
  { type: "aggregatePointsToBoundaries" }
>;

type Props = {
  options: readonly BoundarySourceOption[];
  sourceColumns: readonly QueryColumn.T[];
  binding: PointAggregationBinding;
  onLayerChange: LayerChangeHandler;
};

function _createBoundaryFromOption(
  option: BoundarySourceOption,
): MapLayer.BoundarySource | undefined {
  const geometryColumn = option.columns[0];
  const keyColumn = option.columns[1];
  if (!geometryColumn || !keyColumn) {
    return undefined;
  }
  return {
    datasetId: option.dataset.id,
    geometryColumnId: geometryColumn.id,
    geometryEncoding: "wkt",
    keyColumnId: keyColumn.id,
    displayNameColumnId: undefined,
    simplification: { tolerancePixels: 0.75 },
  };
}

/** Selects the polygon dataset used to aggregate points. */
export function PointBoundaryControls({
  options,
  sourceColumns,
  binding,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const selected = options.find(({ dataset }) => {
    return dataset.id === binding.boundary.datasetId;
  });
  const updateBoundary = (boundary: MapLayer.BoundarySource): void => {
    onLayerChange((current) => {
      return MapLayerUpdates.withPointAggregation({
        layer: current,
        points: binding.points,
        boundary,
        pointColumns: sourceColumns,
      });
    });
  };
  return (
    <>
      <Select
        label={t`Boundary dataset`}
        data={options.map(({ dataset, label }) => {
          return { value: dataset.id, label };
        })}
        value={binding.boundary.datasetId}
        allowDeselect={false}
        onChange={(datasetId) => {
          const option = options.find(({ dataset }) => {
            return dataset.id === datasetId;
          });
          const boundary =
            option ? _createBoundaryFromOption(option) : undefined;
          if (boundary) {
            updateBoundary(boundary);
          }
        }}
      />
      <BoundaryColumnControls
        binding={binding}
        columns={selected?.columns ?? []}
        updateBoundary={updateBoundary}
      />
    </>
  );
}
