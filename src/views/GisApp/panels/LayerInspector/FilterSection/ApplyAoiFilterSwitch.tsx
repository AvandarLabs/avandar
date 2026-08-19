import { useLingui } from "@lingui/react/macro";
import { Switch } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Controls whether the map AOI excludes this layer's features. */
export function ApplyAoiFilterSwitch({
  layer,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Switch
      label={t`Apply area filter`}
      checked={layer.applyAoiFilter}
      onChange={(event) => {
        const applyAoiFilter = event.currentTarget.checked;
        onLayerChange((current) => {
          return MapLayerUpdates.withApplyAoiFilter({
            layer: current,
            applyAoiFilter,
          });
        });
      }}
    />
  );
}
