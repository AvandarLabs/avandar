import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { BoundarySourceOption } from "@/views/GisApp/panels/LayerInspector/DataSection/useBoundarySourceOptions/useBoundarySourceOptions";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { match } from "ts-pattern";

import { BoundaryJoinControls } from "@/views/GisApp/panels/LayerInspector/DataSection/BoundaryJoinControls/BoundaryJoinControls";
import { BufferOfLayerFields } from "@/views/GisApp/panels/LayerInspector/DataSection/BufferOfLayerFields/BufferOfLayerFields";
import { CoordinateBindingControls } from "@/views/GisApp/panels/LayerInspector/DataSection/CoordinateBindingControls";
import { GeometryColumnControls } from "@/views/GisApp/panels/LayerInspector/DataSection/GeometryColumnControls/GeometryColumnControls";
import { GridBinControls } from "@/views/GisApp/panels/LayerInspector/DataSection/GridBinControls/GridBinControls";
import { PointAggregationControls } from "@/views/GisApp/panels/LayerInspector/DataSection/PointAggregationControls/PointAggregationControls";

type Props = {
  layer: MapLayer.T;
  sourceColumns: readonly QueryColumn.T[];
  boundaryOptions: readonly BoundarySourceOption[];
  sourceName?: string;
  onLayerChange: LayerChangeHandler;
};

/** Binding-specific inspector controls for the selected geometry type. */
export function DataSectionBindingControls({
  layer,
  sourceColumns,
  boundaryOptions,
  sourceName = "",
  onLayerChange,
}: Props): ReactNode {
  return match(layer.geoBinding)
    .with({ type: "bufferOfLayer" }, () => {
      return (
        <BufferOfLayerFields
          layer={layer}
          sourceName={sourceName}
          onLayerChange={onLayerChange}
        />
      );
    })
    .with({ type: "geometryColumn" }, () => {
      return (
        <GeometryColumnControls layer={layer} onLayerChange={onLayerChange} />
      );
    })
    .with({ type: "joinToBoundaries" }, () => {
      return (
        <BoundaryJoinControls
          layer={layer}
          options={boundaryOptions}
          onLayerChange={onLayerChange}
        />
      );
    })
    .with({ type: "aggregatePointsToBoundaries" }, () => {
      return (
        <PointAggregationControls
          layer={layer}
          options={boundaryOptions}
          sourceColumns={sourceColumns}
          onLayerChange={onLayerChange}
        />
      );
    })
    .with({ type: "binPointsToGrid" }, () => {
      return (
        <GridBinControls
          layer={layer}
          sourceColumns={sourceColumns}
          onLayerChange={onLayerChange}
        />
      );
    })
    .with({ type: "latLngColumns" }, undefined, () => {
      return (
        <CoordinateBindingControls
          layer={layer}
          onLayerChange={onLayerChange}
        />
      );
    })
    .exhaustive();
}
