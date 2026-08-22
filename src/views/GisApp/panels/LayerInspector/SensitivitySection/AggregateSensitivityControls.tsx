import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { Callout } from "@avandar/ui";
import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";

import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

type Props = {
  sensitivity: Extract<MapLayer.Sensitivity, { mode: "aggregateOnly" }>;
  onLayerChange: LayerChangeHandler;
};

/** Edits aggregate suppression and explains its current rendering limit. */
export function AggregateSensitivityControls({
  sensitivity,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
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
          if (!isNumber(value)) {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withSensitivity({
              layer: current,
              sensitivity: {
                ...sensitivity,
                minCellCount: value,
              },
            });
          });
        }}
      />
      <Callout color="warning">
        {t`Aggregate only draws areas after at least ${sensitivity.minCellCount} contributing records. Areas below that minimum are shown as Not reported without revealing their exact count.`}
      </Callout>
    </>
  );
}
