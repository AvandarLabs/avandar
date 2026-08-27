import { useLingui } from "@lingui/react/macro";
import { Switch } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = { legend: MapLayer.Legend; onLayerChange: LayerChangeHandler };

/** Controls whether the legend explains missing values. */
export function LegendNoDataSwitch({
  legend,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Switch
      label={t`Show a Not reported entry`}
      checked={legend.showNoData}
      description={t`Kept on for a map that will be printed: a reader cannot otherwise tell an area that reported nothing from an area that reported zero.`}
      onChange={(event) => {
        const showNoData = event.currentTarget.checked;
        onLayerChange((current) => {
          return MapLayerUpdates.withLegend({
            layer: current,
            legend: { showNoData },
          });
        });
      }}
    />
  );
}
