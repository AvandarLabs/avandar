import { Model } from "@avandar/models";
import { Stack } from "@mantine/core";
import { LayerCoordinateField } from "@/views/GisApp/panels/LayerFormPanel/LayerCoordinateField";
import { LayerDataSourceField } from "@/views/GisApp/panels/LayerFormPanel/LayerDataSourceField";
import { LayerSymbolColorField } from "@/views/GisApp/panels/LayerFormPanel/LayerSymbolColorField";
import { LayerSymbolSizeField } from "@/views/GisApp/panels/LayerFormPanel/LayerSymbolSizeField";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerFormPanel/LayerFormPanel.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** The active layer's source, coordinate, size, and color fields. */
export function LayerFields({ layer, onLayerChange }: Props): ReactNode {
  const dataSourceId =
    layer.source.dataSource ?
      Model.getTypedId(layer.source.dataSource)
    : undefined;
  return (
    <Stack gap="md">
      <LayerDataSourceField layer={layer} onLayerChange={onLayerChange} />
      <LayerCoordinateField
        axis="latitude"
        dataSourceId={dataSourceId}
        layer={layer}
        onLayerChange={onLayerChange}
      />
      <LayerCoordinateField
        axis="longitude"
        dataSourceId={dataSourceId}
        layer={layer}
        onLayerChange={onLayerChange}
      />
      <LayerSymbolSizeField
        dataSourceId={dataSourceId}
        layer={layer}
        onLayerChange={onLayerChange}
      />
      <LayerSymbolColorField layer={layer} onLayerChange={onLayerChange} />
    </Stack>
  );
}
