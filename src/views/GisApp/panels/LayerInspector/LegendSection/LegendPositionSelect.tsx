import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { legend: MapLayer.Legend; onLayerChange: LayerChangeHandler };

/** Chooses where the map legend is displayed. */
export function LegendPositionSelect({
  legend,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      label={t`Position`}
      data={[
        { value: "bottomLeft", label: t`Bottom left` },
        { value: "bottomRight", label: t`Bottom right` },
        { value: "topRight", label: t`Top right` },
        { value: "hidden", label: t`Hidden` },
      ]}
      value={legend.position}
      allowDeselect={false}
      onChange={(value) => {
        if (!value) {
          return;
        }
        onLayerChange((current) => {
          return MapLayerUpdates.withLegend({
            layer: current,
            legend: {
              position: value as MapLayer.Legend["position"],
            },
          });
        });
      }}
    />
  );
}
