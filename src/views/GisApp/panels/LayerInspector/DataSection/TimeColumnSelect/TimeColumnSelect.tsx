import { Model } from "@avandar/models";
import { propEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { isMapTimeColumn } from "@/views/GisApp/layers/isMapTimeColumn/isMapTimeColumn";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { withQueryColumn } from "@/views/GisApp/layers/MapLayerUpdates/withQueryColumn";
import { useLayerSourceColumns } from "@/views/GisApp/panels/LayerInspector/useLayerSourceColumns";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
};

function _queryColumnOnLayer(
  layer: MapLayer.T,
  column: QueryColumn.T,
): QueryColumn.T {
  return (
    layer.source.queryColumns.find(
      propEq("baseColumn.id", column.baseColumn.id),
    ) ?? column
  );
}

function _bindTimeColumn(
  layer: MapLayer.T,
  column: QueryColumn.T | undefined,
): MapLayer.T {
  if (column === undefined) {
    return MapLayerUpdates.withTimeColumn({ layer, column: undefined });
  }
  const boundColumn = _queryColumnOnLayer(layer, column);
  return MapLayerUpdates.withTimeColumn({
    layer: withQueryColumn({ layer, column: boundColumn }),
    column: boundColumn,
  });
}

function _timeColumnOptions(columns: readonly QueryColumn.T[]) {
  return columns.map((column) => {
    return {
      value: column.baseColumn.id,
      label: QueryColumn.getDerivedColumnName(column),
    };
  });
}

/** Selects the query column used to filter this layer by time. */
export function TimeColumnSelect({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const dataSourceId =
    layer.source.dataSource ?
      Model.getTypedId(layer.source.dataSource)
    : undefined;
  const columns = useLayerSourceColumns(dataSourceId).filter(isMapTimeColumn);
  const selectedColumn = MapLayerUpdates.getQueryColumnFromLayer({
    layer,
    columnId: layer.timeColumn,
  });
  if (layer.geoBinding?.type === "bufferOfLayer") {
    return null;
  }
  return (
    <Select
      label={t`Time column`}
      placeholder={t`Select a column`}
      clearable
      data={_timeColumnOptions(columns)}
      value={selectedColumn?.baseColumn.id ?? null}
      onChange={(columnId) => {
        const column =
          columnId === null ? undefined : (
            columns.find(propEq("baseColumn.id", columnId))
          );
        onLayerChange((current) => {
          return _bindTimeColumn(current, column);
        });
      }}
    />
  );
}
