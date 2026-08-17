import { BoundaryJoinControls } from "@/views/GisApp/panels/LayerInspector/DataSection/BoundaryJoinControls/BoundaryJoinControls";
import { CoordinateBindingControls } from "@/views/GisApp/panels/LayerInspector/DataSection/CoordinateBindingControls";
import { GeometryColumnControls } from "@/views/GisApp/panels/LayerInspector/DataSection/GeometryColumnControls/GeometryColumnControls";
import { GridBinControls } from "@/views/GisApp/panels/LayerInspector/DataSection/GridBinControls/GridBinControls";
import { PointAggregationControls } from "@/views/GisApp/panels/LayerInspector/DataSection/PointAggregationControls/PointAggregationControls";
import type { BoundarySourceOption } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  sourceColumns: readonly QueryColumn.T[];
  boundaryOptions: readonly BoundarySourceOption[];
  onLayerChange: LayerChangeHandler;
};

/** Binding-specific inspector controls for the selected geometry type. */
export function DataSectionBindingControls({
  layer,
  sourceColumns,
  boundaryOptions,
  onLayerChange,
}: Props): ReactNode {
  if (layer.geoBinding?.type === "geometryColumn") {
    return (
      <GeometryColumnControls layer={layer} onLayerChange={onLayerChange} />
    );
  }
  if (layer.geoBinding?.type === "joinToBoundaries") {
    return (
      <BoundaryJoinControls
        layer={layer}
        options={boundaryOptions}
        onLayerChange={onLayerChange}
      />
    );
  }
  if (layer.geoBinding?.type === "aggregatePointsToBoundaries") {
    return (
      <PointAggregationControls
        layer={layer}
        options={boundaryOptions}
        sourceColumns={sourceColumns}
        onLayerChange={onLayerChange}
      />
    );
  }
  if (layer.geoBinding?.type === "binPointsToGrid") {
    return (
      <GridBinControls
        layer={layer}
        sourceColumns={sourceColumns}
        onLayerChange={onLayerChange}
      />
    );
  }
  return (
    <CoordinateBindingControls layer={layer} onLayerChange={onLayerChange} />
  );
}
