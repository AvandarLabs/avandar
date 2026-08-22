import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";

import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

type Props = {
  operation: MapLayer.AreaAggregation["operation"];
  sourceColumns: readonly QueryColumn.T[] | undefined;
  onLayerChange: LayerChangeHandler;
};

type MeasureOperation = "sum" | "avg" | "min" | "max";

function _isMeasureOperation(value: string): value is MeasureOperation {
  return (
    value === "sum" || value === "avg" || value === "min" || value === "max"
  );
}

function _applyAggregationOperation(options: {
  operation: string;
  sourceColumns: readonly QueryColumn.T[] | undefined;
  onLayerChange: LayerChangeHandler;
}): void {
  const { operation, sourceColumns, onLayerChange } = options;
  if (operation === "count") {
    onLayerChange((current) => {
      return MapLayerUpdates.withAreaAggregation({
        layer: current,
        operation: "count",
      });
    });
    return;
  }
  const measureColumn = sourceColumns?.[0];
  if (!_isMeasureOperation(operation) || !measureColumn) {
    return;
  }
  onLayerChange((current) => {
    return MapLayerUpdates.withAreaAggregation({
      layer: current,
      operation,
      measureColumn,
    });
  });
}

/** Selects count vs a numeric measure operation for area aggregation. */
export function AggregationOperationSelect({
  operation,
  sourceColumns,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      label={t`Aggregation`}
      data={[
        { value: "count", label: t`Count` },
        { value: "sum", label: t`Sum` },
        { value: "avg", label: t`Average` },
        { value: "min", label: t`Minimum` },
        { value: "max", label: t`Maximum` },
      ]}
      value={operation}
      allowDeselect={false}
      onChange={(nextOperation) => {
        if (nextOperation) {
          _applyAggregationOperation({
            operation: nextOperation,
            sourceColumns,
            onLayerChange,
          });
        }
      }}
    />
  );
}
