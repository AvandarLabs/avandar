import { useLingui } from "@lingui/react/macro";
import { match } from "ts-pattern";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { AggregateSensitivityControls } from "@/views/GisApp/panels/LayerInspector/SensitivitySection/AggregateSensitivityControls";
import { JitterSensitivityControl } from "@/views/GisApp/panels/LayerInspector/SensitivitySection/JitterSensitivityControl";
import { SensitivityModeSelect } from "@/views/GisApp/panels/LayerInspector/SensitivitySection/SensitivityModeSelect";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Renders the layer's spatial sensitivity policy controls. */
export function SensitivitySection(props: Props): ReactNode {
  const { t } = useLingui();
  const { layer, onLayerChange } = props;
  const { sensitivity } = layer;
  const note = match(sensitivity)
    .with({ mode: "exact" }, () => {
      return t`Exact locations`;
    })
    .with({ mode: "jitter" }, () => {
      return t`Displaced`;
    })
    .with({ mode: "aggregateOnly" }, () => {
      return t`Aggregate only`;
    })
    .exhaustive();
  return (
    <InspectorSection title={t`Sensitivity`} note={note}>
      <SensitivityModeSelect {...{ sensitivity, onLayerChange }} />
      {sensitivity.mode === "jitter" ?
        <JitterSensitivityControl {...{ sensitivity, onLayerChange }} />
      : null}
      {sensitivity.mode === "aggregateOnly" ?
        <AggregateSensitivityControls {...{ sensitivity, onLayerChange }} />
      : null}
    </InspectorSection>
  );
}
