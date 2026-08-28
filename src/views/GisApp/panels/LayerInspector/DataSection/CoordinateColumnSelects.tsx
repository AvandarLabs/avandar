import { useLingui } from "@lingui/react/macro";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { Model } from "@avandar/models";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  dataSourceId: Model.TypedId<QueryDataSource.T> | undefined;
  onLayerChange: LayerChangeHandler;
};

/** Selects the latitude and longitude columns for a point layer. */
export function CoordinateColumnSelects({
  layer,
  dataSourceId,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const binding =
    layer.geoBinding?.type === "latLngColumns" ? layer.geoBinding : undefined;
  const selectAxis = (axis: "latitude" | "longitude") => {
    return (column: QueryColumn.T | null) => {
      onLayerChange((current) => {
        return MapLayerUpdates.withGeoBindingAxis({
          layer: current,
          axis: axis,
          column: column ?? undefined,
        });
      });
    };
  };
  return (
    <>
      <QueryColumnSingleSelect
        label={t`Latitude`}
        placeholder={t`Select a column`}
        dataSourceId={dataSourceId}
        value={
          MapLayerUpdates.getQueryColumnFromLayer({
            layer: layer,
            columnId: binding?.latitude,
          }) ?? null
        }
        onChange={selectAxis("latitude")}
      />
      <QueryColumnSingleSelect
        label={t`Longitude`}
        placeholder={t`Select a column`}
        dataSourceId={dataSourceId}
        value={
          MapLayerUpdates.getQueryColumnFromLayer({
            layer: layer,
            columnId: binding?.longitude,
          }) ?? null
        }
        onChange={selectAxis("longitude")}
      />
    </>
  );
}
