import { useLingui } from "@lingui/react/macro";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { Model } from "@avandar/models";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryDataSource } from "$/models/queries/QueryDataSource/QueryDataSource";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  dataSourceId: Model.TypedId<QueryDataSource.T> | undefined;
  onLayerChange: LayerChangeHandler;
};

/** Selects the latitude and longitude columns for a point layer. */
export function CoordinateColumnSelects(props: Props): ReactNode {
  const { t } = useLingui();
  const { layer, dataSourceId, onLayerChange } = props;
  const selectAxis = (axis: "latitude" | "longitude") => {
    return (
      column: Parameters<typeof MapLayerUpdates.withGeoBindingAxis>[2] | null,
    ) => {
      onLayerChange((current) => {
        return MapLayerUpdates.withGeoBindingAxis(
          current,
          axis,
          column ?? undefined,
        );
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
          MapLayerUpdates.findQueryColumn(layer, layer.geoBinding?.latitude) ??
          null
        }
        onChange={selectAxis("latitude")}
      />
      <QueryColumnSingleSelect
        label={t`Longitude`}
        placeholder={t`Select a column`}
        dataSourceId={dataSourceId}
        value={
          MapLayerUpdates.findQueryColumn(layer, layer.geoBinding?.longitude) ??
          null
        }
        onChange={selectAxis("longitude")}
      />
    </>
  );
}
