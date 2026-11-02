import { Model } from "@avandar/models";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { AreaAggregationControls } from "@/views/GisApp/panels/LayerInspector/DataSection/AreaAggregationControls/AreaAggregationControls";
import { BoundaryJoinKeyFields } from "@/views/GisApp/panels/LayerInspector/DataSection/BoundaryJoinControls/BoundaryJoinKeyFields";
import { BoundarySourceControls } from "@/views/GisApp/panels/LayerInspector/DataSection/BoundarySourceControls/BoundarySourceControls";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { BoundarySourceOption } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  options: readonly BoundarySourceOption[];
  onLayerChange: LayerChangeHandler;
};

function _applyJoin(options: {
  onLayerChange: LayerChangeHandler;
  dataKeyColumn: QueryColumn.T;
  matching: "exact" | "normalizedName";
  boundary: MapLayer.BoundarySource;
}): void {
  const { onLayerChange, dataKeyColumn, matching, boundary } = options;
  onLayerChange((current) => {
    return MapLayerUpdates.withBoundaryJoin({
      layer: current,
      dataKeyColumn,
      matching,
      boundary,
    });
  });
}

/** Edits a complete source-key boundary join and its aggregation. */
export function BoundaryJoinControls({
  layer,
  options,
  onLayerChange,
}: Props): ReactNode {
  const binding = layer.geoBinding;
  if (binding?.type !== "joinToBoundaries") {
    return null;
  }
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
  const dataKeyColumn = MapLayerUpdates.getQueryColumnFromLayer({
    layer,
    columnId: binding.dataKeyColumn,
  });
  if (!dataKeyColumn) {
    return null;
  }
  return (
    <>
      <BoundaryJoinKeyFields
        dataSourceId={dataSourceId}
        dataKeyColumn={dataKeyColumn}
        matching={binding.matching}
        onJoinChange={(column, matching) => {
          _applyJoin({
            onLayerChange,
            dataKeyColumn: column,
            matching,
            boundary: binding.boundary,
          });
        }}
      />
      <BoundarySourceControls
        layer={layer}
        options={options}
        dataKeyColumn={dataKeyColumn}
        onLayerChange={onLayerChange}
      />
      <AreaAggregationControls
        layer={layer}
        dataSourceId={dataSourceId}
        sourceColumns={layer.source.queryColumns}
        onLayerChange={onLayerChange}
      />
    </>
  );
}
