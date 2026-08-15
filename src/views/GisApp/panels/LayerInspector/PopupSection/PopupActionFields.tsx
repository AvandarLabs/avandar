import { useLingui } from "@lingui/react/macro";
import { TextInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  action: MapLayer.PopupAction;
  onLayerChange: LayerChangeHandler;
};

/** Edits the label and URL template of a popup record link. */
export function PopupActionFields(props: Props): ReactNode {
  const { t } = useLingui();
  const { action, onLayerChange } = props;
  const updateAction = (updates: Partial<MapLayer.PopupAction>): void => {
    onLayerChange((current) => {
      return MapLayerUpdates.withPopupAction(current, {
        ...action,
        ...updates,
      });
    });
  };
  return (
    <>
      <TextInput
        label={t`Link label`}
        value={action.label}
        onChange={(event) => {
          updateAction({ label: event.currentTarget.value });
        }}
      />
      <TextInput
        label={t`Link URL`}
        value={action.urlTemplate}
        description={t`Write a field name in braces to fill it from the clicked feature, for example https://example.org/cases/{case_id}.`}
        onChange={(event) => {
          updateAction({ urlTemplate: event.currentTarget.value });
        }}
      />
    </>
  );
}
