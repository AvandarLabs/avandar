import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { BoundarySourceOption } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { Model } from "@avandar/models";

import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { AreaAggregationControls } from "@/views/GisApp/panels/LayerInspector/DataSection/AreaAggregationControls/AreaAggregationControls";
import { PointBoundaryControls } from "@/views/GisApp/panels/LayerInspector/DataSection/PointAggregationControls/PointBoundaryControls";
import { PointGeometryTypeSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/PointAggregationControls/PointGeometryTypeSelect";
import { PointInputControls } from "@/views/GisApp/panels/LayerInspector/DataSection/PointAggregationControls/PointInputControls";

type Props = {
  layer: MapLayer.T;
  options: readonly BoundarySourceOption[];
  sourceColumns: readonly QueryColumn.T[];
  onLayerChange: LayerChangeHandler;
};

/**
 * Edits point input, polygon boundaries, and the resulting area aggregation.
 */
export function PointAggregationControls({
  layer,
  options,
  sourceColumns,
  onLayerChange,
}: Props): ReactNode {
  const binding = layer.geoBinding;
  if (binding?.type !== "aggregatePointsToBoundaries") {
    return null;
  }
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
  const updatePoints = (points: MapLayer.PointBinding): void => {
    onLayerChange((current) => {
      return MapLayerUpdates.withPointAggregation({
        layer: current,
        points,
        boundary: binding.boundary,
        pointColumns: sourceColumns,
      });
    });
  };
  return (
    <>
      <PointGeometryTypeSelect
        pointsType={binding.points.type}
        sourceColumns={sourceColumns}
        onPointsTypeChange={updatePoints}
      />
      <PointInputControls
        layer={layer}
        binding={binding}
        updatePoints={updatePoints}
      />
      <PointBoundaryControls
        options={options}
        sourceColumns={sourceColumns}
        binding={binding}
        onLayerChange={onLayerChange}
      />
      <AreaAggregationControls
        layer={layer}
        dataSourceId={dataSourceId}
        sourceColumns={sourceColumns}
        onLayerChange={onLayerChange}
      />
    </>
  );
}
