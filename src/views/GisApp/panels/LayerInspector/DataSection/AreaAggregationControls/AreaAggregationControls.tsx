import { AggregationMeasureSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/AreaAggregationControls/AggregationMeasureSelect";
import { AggregationOperationSelect } from "@/views/GisApp/panels/LayerInspector/DataSection/AreaAggregationControls/AggregationOperationSelect";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { Model } from "@avandar/models";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  dataSourceId: Model.TypedId<QueryDataSource.T> | undefined;
  sourceColumns?: readonly QueryColumn.T[];
  onLayerChange: LayerChangeHandler;
};

/** Selects the per-boundary operation and optional numeric measure. */
export function AreaAggregationControls({
  layer,
  dataSourceId,
  sourceColumns,
  onLayerChange,
}: Props): ReactNode {
  const binding = layer.geoBinding;
  if (
    binding?.type !== "joinToBoundaries" &&
    binding?.type !== "aggregatePointsToBoundaries" &&
    binding?.type !== "binPointsToGrid"
  ) {
    return null;
  }
  const aggregation = binding.aggregation;
  return (
    <>
      <AggregationOperationSelect
        operation={aggregation.operation}
        sourceColumns={sourceColumns}
        onLayerChange={onLayerChange}
      />
      {aggregation.operation !== "count" ? (
        <AggregationMeasureSelect
          layer={layer}
          dataSourceId={dataSourceId}
          measureColumnId={aggregation.measureColumn}
          operation={aggregation.operation}
          onLayerChange={onLayerChange}
        />
      ) : null}
    </>
  );
}
