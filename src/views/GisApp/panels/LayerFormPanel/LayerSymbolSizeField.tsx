import { useLingui } from "@lingui/react/macro";
import { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import { notifyError } from "@/utils/notifications/notify";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/panels/LayerFormPanel/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerFormPanel/LayerFormPanel.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  dataSourceId: string | undefined;
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
};

/** Selects the numeric column that controls proportional symbol size. */
export function LayerSymbolSizeField({
  dataSourceId,
  layer,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const selectedColumn =
    layer.symbology.type === "proportionalSymbol" ?
      MapLayerUpdates.findQueryColumn(layer, layer.symbology.value)
    : undefined;
  return (
    <QueryColumnSingleSelect
      label={t`Symbol size`}
      placeholder={t`Select symbol size column`}
      dataSourceId={dataSourceId}
      value={selectedColumn ?? null}
      onChange={(column) => {
        if (column && !QueryColumn.isNumeric(column)) {
          notifyError({
            title: t`Invalid column type`,
            message: t`Symbol size column must be numeric.`,
          });
          return;
        }
        onLayerChange((current) => {
          return MapLayerUpdates.withSymbolSizeColumn(
            current,
            column ?? undefined,
          );
        });
      }}
      comboboxProps={{ withinPortal: false }}
    />
  );
}
