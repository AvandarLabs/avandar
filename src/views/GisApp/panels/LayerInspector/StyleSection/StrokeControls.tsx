import { useLingui } from "@lingui/react/macro";
import { ColorInput, Group, NumberInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  stroke: MapLayer.Symbology["stroke"];
  onLayerChange: LayerChangeHandler;
};

/** Edits a symbol's outline color and width. */
export function StrokeControls(props: Props): ReactNode {
  const { t } = useLingui();
  const { stroke, onLayerChange } = props;
  return (
    <Group grow align="flex-start">
      <ColorInput
        label={t`Outline`}
        format="hex"
        value={stroke.color}
        onChange={(color) => {
          onLayerChange((current) => {
            return MapLayerUpdates.withStroke(current, { color });
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
          if (typeof value !== "number") {
            return;
          }
          onLayerChange((current) => {
            return MapLayerUpdates.withStroke(current, { width: value });
          });
        }}
      />
    </Group>
  );
}
