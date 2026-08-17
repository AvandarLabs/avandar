import { useLingui } from "@lingui/react/macro";
import { InspectorSection } from "@/views/GisApp/panels/LayerInspector/InspectorSection/InspectorSection";
import { PopupActionFields } from "@/views/GisApp/panels/LayerInspector/PopupSection/PopupActionFields";
import { PopupActionSwitch } from "@/views/GisApp/panels/LayerInspector/PopupSection/PopupActionSwitch";
import { PopupFieldSelect } from "@/views/GisApp/panels/LayerInspector/PopupSection/PopupFieldSelect";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Configures the fields and record link shown for a clicked feature. */
export function PopupSection({ layer, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  const { columnIds, action } = layer.popup;
  const note =
    columnIds === "all" ? t`All fields`
    : columnIds.length === 1 ? t`1 field`
    : t`${columnIds.length} fields`;
  return (
    <InspectorSection title={t`Popup`} note={note}>
      <PopupFieldSelect layer={layer} onLayerChange={onLayerChange} />
      <PopupActionSwitch
        isEnabled={action !== undefined}
        onLayerChange={onLayerChange}
      />
      {action ?
        <PopupActionFields action={action} onLayerChange={onLayerChange} />
      : null}
    </InspectorSection>
  );
}
