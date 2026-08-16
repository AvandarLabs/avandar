import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { Model } from "@avandar/models";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  dataSourceId: Model.TypedId<QueryDataSource.T> | undefined;
  sourceColumns?: readonly QueryColumn.T[];
  onLayerChange: LayerChangeHandler;
};

/** Selects the per-boundary operation and optional numeric measure. */
export function AreaAggregationControls(props: Props): ReactNode {
  const { t } = useLingui();
  const binding = props.layer.geoBinding;
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
      <Select
        label={t`Aggregation`}
        data={[
          { value: "count", label: t`Count` },
          { value: "sum", label: t`Sum` },
          { value: "avg", label: t`Average` },
          { value: "min", label: t`Minimum` },
          { value: "max", label: t`Maximum` },
        ]}
        value={aggregation.operation}
        allowDeselect={false}
        onChange={(operation) => {
          if (!operation) {
            return;
          }
          const measureColumn = props.sourceColumns?.[0];
          if (operation !== "count" && !measureColumn) {
            return;
          }
          props.onLayerChange((current) => {
            return MapLayerUpdates.withAreaAggregation(
              current,
              operation === "count" ?
                { operation }
              : {
                  operation: operation as "sum" | "avg" | "min" | "max",
                  measureColumn: measureColumn!,
                },
            );
          });
        }}
      />
      {aggregation.operation !== "count" ?
        <QueryColumnSingleSelect
          label={t`Measure`}
          placeholder={t`Select a numeric column`}
          dataSourceId={props.dataSourceId}
          value={
            MapLayerUpdates.getQueryColumnFromLayer({
              layer: props.layer,
              columnId: aggregation.measureColumn,
            }) ?? null
          }
          onChange={(measureColumn) => {
            if (!measureColumn) {
              return;
            }
            props.onLayerChange((current) => {
              return MapLayerUpdates.withAreaAggregation(current, {
                operation: aggregation.operation,
                measureColumn,
              });
            });
          }}
        />
      : null}
    </>
  );
}
