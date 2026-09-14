import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  symbology: MapLayer.ClusterSymbology;
  onLayerChange: LayerChangeHandler;
};

/** Edits how close points must be to form a cluster. */
export function ClusterControls({
  symbology,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <NumberInput
      label={t`Cluster radius`}
      suffix=" px"
      min={1}
      max={200}
      value={symbology.radiusPx}
      onChange={(value) => {
        if (!isNumber(value)) {
          return;
        }
        onLayerChange((current) => {
          return MapLayerUpdates.withClusterRadius({
            layer: current,
            radiusPx: value,
          });
        });
      }}
    />
  );
}
