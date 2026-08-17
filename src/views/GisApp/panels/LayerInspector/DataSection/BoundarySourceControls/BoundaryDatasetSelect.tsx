import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { BoundarySourceOption } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

type JoinBinding = Extract<MapLayer.GeoBinding, { type: "joinToBoundaries" }>;

type Props = {
  options: readonly BoundarySourceOption[];
  binding: JoinBinding;
  dataKeyColumn: QueryColumn.T;
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

/** Selects the polygon dataset a layer joins to. */
export function BoundaryDatasetSelect({
  options,
  binding,
  dataKeyColumn,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
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
        const boundary = option ? _createBoundaryFromOption(option) : undefined;
        if (!boundary) {
          return;
        }
        onLayerChange((current) => {
          return MapLayerUpdates.withBoundaryJoin({
            layer: current,
            dataKeyColumn,
            matching: binding.matching,
            boundary,
          });
        });
      }}
    />
  );
}
