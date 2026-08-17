import { Stack } from "@mantine/core";
import { MapStylePicker } from "@/views/GisApp/basemap/MapStylePicker";
import { MapStyles } from "@/views/GisApp/basemap/MapStyles";
import { LayerFormPopover } from "@/views/GisApp/panels/LayerFormPanel/LayerFormPopover/LayerFormPopover";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerFormPanel/LayerFormPanel.types";
import type { AvaMap } from "$/models/AvaMap/AvaMap";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  basemap: AvaMap.Basemap;
  onLayerChange: LayerChangeHandler;
  onBasemapChange: (basemap: AvaMap.Basemap) => void;
};

/**
 * The layer editing panel for the GIS app: picks the layer's data source,
 * its latitude and longitude columns, an optional symbol size column, its
 * color, and the map's basemap style.
 */
export function LayerFormPanel({
  layer,
  basemap,
  onLayerChange,
  onBasemapChange,
}: Readonly<Props>): ReactNode {
  return (
    <Stack gap="xxxs">
      <MapStylePicker
        mapStyles={MapStyles}
        value={basemap.type === "builtIn" ? basemap.style : "avandar"}
        onChange={(style) => {
          onBasemapChange({ type: "builtIn", style });
        }}
      />
      <LayerFormPopover layer={layer} onLayerChange={onLayerChange} />
    </Stack>
  );
}
