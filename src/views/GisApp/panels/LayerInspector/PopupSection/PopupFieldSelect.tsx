import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { Model } from "@avandar/models";
import { propIsInArray } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";

import { QueryColumnMultiSelect } from "@/views/DataExplorerApp/QueryColumnMultiSelect/QueryColumnMultiSelect";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { useLayerSourceColumns } from "@/views/GisApp/panels/LayerInspector/useLayerSourceColumns";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Selects the fields fetched and displayed for a clicked feature. */
export function PopupFieldSelect({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const dataSourceId = layer.source.dataSource
    ? Model.getTypedId(layer.source.dataSource)
    : undefined;
  const sourceColumns = useLayerSourceColumns(dataSourceId);
  const selectedColumns =
    layer.popup.columnIds === "all"
      ? sourceColumns
      : layer.source.queryColumns.filter(
          propIsInArray("id", layer.popup.columnIds),
        );
  return (
    <QueryColumnMultiSelect
      label={t`Fields`}
      placeholder={t`Select the fields a reader should see`}
      dataSourceId={dataSourceId}
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
