import { matchLiteral } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { QueryColumnSingleSelect } from "@/views/DataExplorerApp/QueryColumnSingleSelect";
import { MapLayerUpdates } from "@/views/GisApp/panels/LayerFormPanel/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerFormPanel/LayerFormPanel.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  axis: "latitude" | "longitude";
  dataSourceId: string | undefined;
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
};

/** Selects one coordinate axis from the active layer's source columns. */
export function LayerCoordinateField({
  axis,
  dataSourceId,
  layer,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const copy = matchLiteral(axis, {
    latitude: {
      label: t`Latitude column`,
      placeholder: t`Select latitude column`,
    },
    longitude: {
      label: t`Longitude column`,
      placeholder: t`Select longitude column`,
    },
  });
  return (
    <QueryColumnSingleSelect
      {...copy}
      dataSourceId={dataSourceId}
      value={
        MapLayerUpdates.findQueryColumn(layer, layer.geoBinding?.[axis]) ?? null
      }
      onChange={(column) => {
        onLayerChange((current) => {
          return MapLayerUpdates.withGeoBindingAxis(
            current,
            axis,
            column ?? undefined,
          );
        });
      }}
      comboboxProps={{ withinPortal: false }}
    />
  );
}
