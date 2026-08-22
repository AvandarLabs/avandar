import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { Model } from "@avandar/models";
import { useLingui } from "@lingui/react/macro";

import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

type Props = {
  layer: MapLayer.T;
  columnId: QueryColumn.Id;
  onLayerChange: LayerChangeHandler;
};

/** Selects the encoded geometry column for a direct geometry binding. */
export function GeometrySourceColumnSelect({
  layer,
  columnId,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
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
          return MapLayerUpdates.withGeometryColumn({
            layer: current,
            column,
          });
        });
      }}
    />
  );
}
