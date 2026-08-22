import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { TextInput } from "@mantine/core";

import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

type Props = { legend: MapLayer.Legend; onLayerChange: LayerChangeHandler };

/** Edits a layer legend's title and optional units. */
export function LegendTextControls({
  legend,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <>
      <TextInput
        label={t`Title`}
        value={legend.title}
        onChange={(event) => {
          const title = event.currentTarget.value;
          onLayerChange((current) => {
            return MapLayerUpdates.withLegend({
              layer: current,
              legend: { title },
            });
          });
        }}
      />
      <TextInput
        label={t`Units`}
        placeholder={t`Leave empty when the value has none`}
        value={legend.units ?? ""}
        onChange={(event) => {
          const value = event.currentTarget.value;
          onLayerChange((current) => {
            return MapLayerUpdates.withLegend({
              layer: current,
              legend: {
                units: value === "" ? undefined : value,
              },
            });
          });
        }}
      />
    </>
  );
}
