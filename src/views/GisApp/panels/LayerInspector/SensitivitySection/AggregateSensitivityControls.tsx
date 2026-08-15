import { Callout } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  sensitivity: Extract<MapLayer.Sensitivity, { mode: "aggregateOnly" }>;
  onLayerChange: LayerChangeHandler;
};

/** Edits aggregate suppression and explains its current rendering limit. */
export function AggregateSensitivityControls(props: Props): ReactNode {
  const { t } = useLingui();
  const { sensitivity, onLayerChange } = props;
  return (
    <>
      <NumberInput
        label={t`Suppress areas below`}
        suffix={t` records`}
        min={1}
        max={100}
        value={sensitivity.minCellCount}
        description={t`Areas with fewer records are drawn as Not reported, never as zero.`}
        onChange={(value) => {
          if (typeof value !== "number") {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withSensitivity(current, {
              ...sensitivity,
              minCellCount: value,
            });
          });
        }}
      />
      <Callout color="warning">
        {t`This layer cannot be drawn yet. Aggregate only needs an area to aggregate into, and boundary joins arrive in a later release.`}
      </Callout>
    </>
  );
}
