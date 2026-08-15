import { useLingui } from "@lingui/react/macro";
import { TextInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { legend: MapLayer.Legend; onLayerChange: LayerChangeHandler };

/** Edits a layer legend's title and optional units. */
export function LegendTextControls(props: Props): ReactNode {
  const { t } = useLingui();
  const { legend, onLayerChange } = props;
  return (
    <>
      <TextInput
        label={t`Title`}
        value={legend.title}
        onChange={(event) => {
          const title = event.currentTarget.value;
          onLayerChange((current) => {
            return MapLayerUpdates.withLegend(current, { title });
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
            return MapLayerUpdates.withLegend(current, {
              units: value === "" ? undefined : value,
            });
          });
        }}
      />
    </>
  );
}
