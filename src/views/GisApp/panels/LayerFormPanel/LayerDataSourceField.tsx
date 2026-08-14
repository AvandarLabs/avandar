import { QueryDataSourceSelect } from "@/views/DataExplorerApp/QueryDataSourceSelect";
import { MapLayerUpdates } from "@/views/GisApp/panels/LayerFormPanel/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerFormPanel/LayerFormPanel.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Selects the data source that supplies rows to the active map layer. */
export function LayerDataSourceField({
  layer,
  onLayerChange,
}: Props): ReactNode {
  return (
    <QueryDataSourceSelect
      value={layer.source.dataSource ?? null}
      onChange={(value) => {
        onLayerChange((current) => {
          return MapLayerUpdates.withDataSource(current, value ?? undefined);
        });
      }}
      comboboxProps={{ withinPortal: false }}
    />
  );
}
