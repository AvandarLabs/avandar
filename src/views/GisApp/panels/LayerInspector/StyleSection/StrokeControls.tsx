import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { ColorInput, Group, NumberInput } from "@mantine/core";

import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

type Props = {
  stroke: MapLayer.Stroke;
  onLayerChange: LayerChangeHandler;
};

/** Edits a symbol's outline color and width. */
export function StrokeControls({ stroke, onLayerChange }: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Group grow align="flex-start">
      <ColorInput
        label={t`Outline`}
        format="hex"
        value={stroke.color}
        onChange={(color) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withStroke({
              layer: current,
              stroke: { color },
            });
          });
        }}
      />
      <NumberInput
        label={t`Outline width`}
        suffix=" px"
        min={0}
        max={6}
        step={0.5}
        value={stroke.width}
        onChange={(value) => {
          if (!isNumber(value)) {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withStroke({
              layer: current,
              stroke: { width: value },
            });
          });
        }}
      />
    </Group>
  );
}
