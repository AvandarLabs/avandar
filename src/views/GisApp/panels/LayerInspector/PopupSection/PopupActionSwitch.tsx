import { useLingui } from "@lingui/react/macro";
import { Switch } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = { isEnabled: boolean; onLayerChange: LayerChangeHandler };

/** Enables or removes a source-record link from the popup. */
export function PopupActionSwitch(props: Props): ReactNode {
  const { t } = useLingui();
  const { isEnabled, onLayerChange } = props;
  return (
    <Switch
      label={t`Link to the source record`}
      checked={isEnabled}
      onChange={(event) => {
        const isOn = event.currentTarget.checked;
        onLayerChange((current) => {
          return MapLayerUpdates.withPopupAction(
            current,
            isOn ? { label: "", urlTemplate: "" } : undefined,
          );
        });
      }}
    />
  );
}
