import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { useLayerSourceColumns } from "@/views/GisApp/panels/LayerInspector/useLayerSourceColumns";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  columnId: QueryColumn.Id;
  onLayerChange: LayerChangeHandler;
};

/**
 * Selects the encoded geometry column for a direct geometry binding. Picking
 * one also gives a popup that still shows "all" fields its default fields,
 * as binding latitude and longitude does, so the layer's popup and feature
 * list have columns to show.
 */
export function GeometrySourceColumnSelect({
  layer,
  columnId,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
  const sourceColumns = useLayerSourceColumns(dataSourceId);
  return (
    <QueryColumnSingleSelect
      label={t`Geometry column`}
      placeholder={t`Select a column`}
      dataSourceId={dataSourceId}
      value={
        MapLayerUpdates.getQueryColumnFromLayer({ layer, columnId }) ?? null
      }
      onChange={(column) => {
        if (!column) {
          return;
        }
        onLayerChange((current) => {
          const withColumn = MapLayerUpdates.withGeometryColumn({
            layer: current,
            column,
          });
          // Until the source's columns load, keep "all" rather than none.
          return sourceColumns.length === 0
            ? withColumn
            : MapLayerUpdates.withDefaultPopupColumns({
                layer: withColumn,
                availableColumns: sourceColumns,
              });
        });
      }}
    />
  );
}
