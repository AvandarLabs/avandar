import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  sensitivity: Extract<MapLayer.Sensitivity, { mode: "jitter" }>;
  onLayerChange: LayerChangeHandler;
};

/** Edits the deterministic displacement radius for sensitive points. */
export function JitterSensitivityControl({
  sensitivity,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <NumberInput
      label={t`Displace within`}
      suffix={t` m`}
      min={10}
      max={20000}
      value={sensitivity.radiusMeters}
      description={t`Each point moves by the same amount every time this map is opened, so a reader cannot average several views back to the real location.`}
      onChange={(value) => {
        if (!isNumber(value)) {
          return;
        }
        onLayerChange((current) => {
          return MapLayerUpdates.withSensitivity({
            layer: current,
            sensitivity: {
              mode: "jitter",
              radiusMeters: value,
            },
          });
        });
      }}
    />
  );
}
