import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { NumberInput, Switch, TextInput } from "@mantine/core";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import {
  clampBufferDistance,
  convertBufferDistance,
  getBufferDistanceLimitsFromUnit,
} from "@/views/GisApp/layers/bufferDistanceLimits/bufferDistanceLimits";
import { BUFFER_DISTANCE_UNIT_LABELS } from "@/views/GisApp/layers/BufferDistanceUnit.constants";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  sourceName: string;
  onLayerChange: LayerChangeHandler;
};

/** Stores a distance typed in the buffer's own unit as whole meters. */
function _bindBufferDistance(
  options: Readonly<{
    onLayerChange: LayerChangeHandler;
    distance: string | number;
    unit: MapLayer.BufferDistanceUnit;
  }>,
): void {
  const { onLayerChange, distance, unit } = options;
  if (!isNumber(distance)) {
    return;
  }
  const distanceMeters = MapLayer.getMetersFromBufferDistance({
    distance: clampBufferDistance({ distance, unit }),
    unit,
  });
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

type DistanceInputProps = {
  binding: MapLayer.BufferOfLayerBinding;
  onLayerChange: LayerChangeHandler;
};

/** The buffer distance, shown and edited in the unit it was typed in. */
function BufferDistanceInput({
  binding,
  onLayerChange,
}: DistanceInputProps): ReactNode {
  const { i18n, t } = useLingui();
  const unit = binding.distanceUnit;
  const unitLabel = i18n._(BUFFER_DISTANCE_UNIT_LABELS[unit]);
  const { minDistance, maxDistance } = getBufferDistanceLimitsFromUnit(unit);
  return (
    <NumberInput
      label={t`Distance (${unitLabel})`}
      description={t`At least ${minDistance} ${unitLabel}`}
      value={convertBufferDistance({
        distance: binding.distanceMeters,
        fromUnit: "m",
        toUnit: unit,
      })}
      min={minDistance}
      max={maxDistance}
      clampBehavior="blur"
      allowNegative={false}
      decimalScale={2}
      onChange={(distance) => {
        _bindBufferDistance({ onLayerChange, distance, unit });
      }}
    />
  );
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
      <BufferDistanceInput binding={binding} onLayerChange={onLayerChange} />
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
