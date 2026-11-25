import { Model } from "@avandar/models";
import { propIsInArray } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { useMemo } from "react";
import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
import { useSourceColumnCatalog } from "@/views/DataExplorerApp/useSourceColumnCatalog/useSourceColumnCatalog";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { useLayerSourceColumns } from "@/views/GisApp/panels/LayerInspector/useLayerSourceColumns";
import { useIsPlacesLayer } from "@/views/GisApp/places/useIsPlacesLayer";
import { isPlaceIdColumn } from "@/views/GisApp/places/withPlaceIdColumn/withPlaceIdColumn";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Drops a places layer's internal `place_id`. Other layers keep all. */
function _withoutPlaceId(
  columns: readonly QueryColumn.T[],
  isPlacesLayer: boolean,
): readonly QueryColumn.T[] {
  return isPlacesLayer
    ? columns.filter((column) => {
        return !isPlaceIdColumn(column);
      })
    : columns;
}

/**
 * Selects the fields fetched and displayed for a clicked feature. A places
 * layer never offers its internal `place_id`.
 */
export function PopupFieldSelect({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
  const isPlacesLayer = useIsPlacesLayer(layer);
  const sourceColumns = useLayerSourceColumns(dataSourceId);
  const catalog = useSourceColumnCatalog(dataSourceId);
  const offeredCatalog = useMemo(() => {
    return {
      ...catalog,
      columns: _withoutPlaceId(catalog.columns, isPlacesLayer),
    };
  }, [catalog, isPlacesLayer]);
  const selectedColumns = _withoutPlaceId(
    layer.popup.columnIds === "all"
      ? sourceColumns
      : layer.source.queryColumns.filter(
          propIsInArray("id", layer.popup.columnIds),
        ),
    isPlacesLayer,
  );
  return (
    <QueryColumnMultiSelect
      label={t`Fields`}
      placeholder={t`Select the fields a reader should see`}
      dataSourceId={dataSourceId}
      sourceCatalog={offeredCatalog}
      value={selectedColumns}
      onChange={(columns) => {
        onLayerChange((current) => {
          return MapLayerUpdates.withPopupColumns({
            layer: current,
            columns: columns,
          });
        });
      }}
      description={t`The layer fetches exactly these fields, so adding one also makes it available to filter on.`}
    />
  );
}
