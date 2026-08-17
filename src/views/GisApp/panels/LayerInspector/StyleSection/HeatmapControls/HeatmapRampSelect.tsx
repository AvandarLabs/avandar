import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { HEATMAP_RAMPS } from "@/views/GisApp/panels/LayerInspector/StyleSection/HeatmapControls/HeatmapControls.constants";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  ramp: readonly string[];
  onLayerChange: LayerChangeHandler;
};

function _getRampName(ramp: readonly string[]): keyof typeof HEATMAP_RAMPS {
  if (ramp[0] === HEATMAP_RAMPS.blue[0]) {
    return "blue";
  }
  if (ramp[0] === HEATMAP_RAMPS.orange[0]) {
    return "orange";
  }
  return "ochre";
}

/** Selects the sequential color ramp used by a heatmap layer. */
export function HeatmapRampSelect({ ramp, onLayerChange }: Props): ReactNode {
  const { t, i18n } = useLingui();
  return (
    <Select
      label={t`Color ramp`}
      data={[
        { value: "ochre", label: i18n._(msg`Ochre`) },
        { value: "blue", label: i18n._(msg`Blue`) },
        { value: "orange", label: i18n._(msg`Orange`) },
      ]}
      value={_getRampName(ramp)}
      allowDeselect={false}
      onChange={(rampName) => {
        if (rampName !== "ochre" && rampName !== "blue" && rampName !== "orange") {
          return;
        }
        onLayerChange((current) => {
          return MapLayerUpdates.withHeatmapRamp({
            layer: current,
            ramp: HEATMAP_RAMPS[rampName],
          });
        });
      }}
    />
  );
}
