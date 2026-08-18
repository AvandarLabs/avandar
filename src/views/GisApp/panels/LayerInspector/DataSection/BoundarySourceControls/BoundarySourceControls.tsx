import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { BoundaryColumnFields } from "@/views/GisApp/panels/LayerInspector/DataSection/BoundarySourceControls/BoundaryColumnFields";
import { BoundaryDatasetSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/BoundarySourceControls/BoundaryDatasetSelect";
import type { BoundarySourceOption } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  options: readonly BoundarySourceOption[];
  dataKeyColumn: QueryColumn.T;
  onLayerChange: LayerChangeHandler;
};

type BoundaryColumnField =
  | "geometryColumnId"
  | "keyColumnId"
  | "displayNameColumnId";

function _applyBoundaryColumn(options: {
  onLayerChange: LayerChangeHandler;
  dataKeyColumn: QueryColumn.T;
  matching: Extract<
    MapLayer.GeoBinding,
    { type: "joinToBoundaries" }
  >["matching"];
  boundary: MapLayer.BoundarySource;
  field: BoundaryColumnField;
  columnId: DatasetColumn.Id | undefined;
}): void {
  const { onLayerChange, dataKeyColumn, matching, boundary, field, columnId } =
    options;
  onLayerChange((current) => {
    return MapLayerUpdates.withBoundaryJoin({
      layer: current,
      dataKeyColumn,
      matching,
      boundary: { ...boundary, [field]: columnId },
    });
  });
}

/** Edits the columns in a stable boundary-source reference. */
export function BoundarySourceControls({
  layer,
  options,
  dataKeyColumn,
  onLayerChange,
}: Props): ReactNode {
  const binding = layer.geoBinding;
  if (binding?.type !== "joinToBoundaries") {
    return null;
  }
  const selected = options.find(({ dataset }) => {
    return dataset.id === binding.boundary.datasetId;
  });
  const columnData = (selected?.columns ?? []).map((column) => {
    return { value: column.id, label: column.name };
  });
  return (
    <>
      <BoundaryDatasetSelect
        options={options}
        binding={binding}
        dataKeyColumn={dataKeyColumn}
        onLayerChange={onLayerChange}
      />
      <BoundaryColumnFields
        columnData={columnData}
        geometryColumnId={binding.boundary.geometryColumnId}
        keyColumnId={binding.boundary.keyColumnId}
        displayNameColumnId={binding.boundary.displayNameColumnId}
        onColumnChange={(field, columnId) => {
          _applyBoundaryColumn({
            onLayerChange,
            dataKeyColumn,
            matching: binding.matching,
            boundary: binding.boundary,
            field,
            columnId,
          });
        }}
      />
    </>
  );
}
