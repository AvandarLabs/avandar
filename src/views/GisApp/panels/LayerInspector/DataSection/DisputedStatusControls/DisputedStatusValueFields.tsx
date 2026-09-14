import { useLingui } from "@lingui/react/macro";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import { DisputedValuesInput } from "@/views/GisApp/panels/LayerInspector/DataSection/DisputedStatusControls/DisputedValuesInput/DisputedValuesInput";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  onLayerChange: LayerChangeHandler;
};

/** Replaces the disputed list, leaving the undetermined list as-is. */
function _onDisputedChange(onLayerChange: LayerChangeHandler) {
  return (disputed: string[]) => {
    onLayerChange((current) => {
      return MapLayerUpdates.withDisputedStatusValues({
        layer: current,
        values: {
          disputed,
          undetermined: current.disputedStatusValues.undetermined,
        },
      });
    });
  };
}

/** Replaces the undetermined list, leaving the disputed list as-is. */
function _onUndeterminedChange(onLayerChange: LayerChangeHandler) {
  return (undetermined: string[]) => {
    onLayerChange((current) => {
      return MapLayerUpdates.withDisputedStatusValues({
        layer: current,
        values: {
          disputed: current.disputedStatusValues.disputed,
          undetermined,
        },
      });
    });
  };
}

/**
 * The disputed and undetermined value fields for a bound disputed-status
 * column. Each already-assigned value is offered as a suggestion on the
 * other field, so the author can see what's taken before typing a
 * conflicting one; `MapLayerUpdates.withDisputedStatusValues` rejects the
 * conflict either way.
 */
export function DisputedStatusValueFields({
  layer,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const knownValues = [
    ...layer.disputedStatusValues.disputed,
    ...layer.disputedStatusValues.undetermined,
  ];
  return (
    <>
      <DisputedValuesInput
        label={t`Disputed values`}
        suggestions={knownValues}
        value={layer.disputedStatusValues.disputed}
        onChange={_onDisputedChange(onLayerChange)}
      />
      <DisputedValuesInput
        label={t`Undetermined values`}
        suggestions={knownValues}
        value={layer.disputedStatusValues.undetermined}
        onChange={_onUndeterminedChange(onLayerChange)}
      />
    </>
  );
}
