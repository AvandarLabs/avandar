import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { Model } from "@avandar/models";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";

import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

type Props = {
  layer: MapLayer.T;
  dataSourceId: Model.TypedId<QueryDataSource.T> | undefined;
  measureColumnId: QueryColumn.Id;
  operation: Exclude<MapLayer.AreaAggregation["operation"], "count">;
  onLayerChange: LayerChangeHandler;
};

/** Selects the numeric column used by a non-count area aggregation. */
export function AggregationMeasureSelect({
  layer,
  dataSourceId,
  measureColumnId,
  operation,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <QueryColumnSingleSelect
      label={t`Measure`}
      placeholder={t`Select a numeric column`}
      dataSourceId={dataSourceId}
      value={
        MapLayerUpdates.getQueryColumnFromLayer({
          layer,
          columnId: measureColumnId,
        }) ?? null
      }
      onChange={(measureColumn) => {
        if (!measureColumn) {
          return;
        }
        onLayerChange((current) => {
          return MapLayerUpdates.withAreaAggregation({
            layer: current,
            operation,
            measureColumn,
          });
        });
      }}
    />
  );
}
