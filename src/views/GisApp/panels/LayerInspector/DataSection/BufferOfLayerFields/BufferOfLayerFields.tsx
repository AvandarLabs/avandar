import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { NumberInput, Switch, TextInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  sourceName: string;
  onLayerChange: LayerChangeHandler;
};

function _bindBufferDistance(
  onLayerChange: LayerChangeHandler,
  distanceMeters: string | number,
): void {
  if (!isNumber(distanceMeters)) {
    return;
  }
  onLayerChange((current) => {
    return MapLayerUpdates.withBufferDistanceMeters({
      layer: current,
      distanceMeters,
    });
  });
}

function _bindBufferDissolve(
  onLayerChange: LayerChangeHandler,
  dissolve: boolean,
): void {
  onLayerChange((current) => {
    return MapLayerUpdates.withBufferDissolve({ layer: current, dissolve });
  });
}

/** Inspector fields for a buffer-of-layer binding. */
export function BufferOfLayerFields({
  layer,
  sourceName,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const binding = layer.geoBinding;
  if (binding?.type !== "bufferOfLayer") {
    return null;
  }
  return (
    <>
      <TextInput label={t`Source`} value={sourceName} readOnly />
      <NumberInput
        label={t`Distance (meters)`}
        value={binding.distanceMeters}
        min={100}
        max={1_000_000}
        clampBehavior="blur"
        allowDecimal={false}
        onChange={(distanceMeters) => {
          _bindBufferDistance(onLayerChange, distanceMeters);
        }}
      />
      <Switch
        label={t`Dissolve`}
        checked={binding.dissolve}
        onChange={(event) => {
          _bindBufferDissolve(onLayerChange, event.currentTarget.checked);
        }}
      />
    </>
  );
}
