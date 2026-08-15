import { isNumber } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { NumberInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  symbology: Extract<MapLayer.Symbology, { type: "circle" }>;
  onLayerChange: LayerChangeHandler;
};

/** Edits a fixed point symbol radius. */
export function CircleRadiusControl({
  symbology,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <NumberInput
      label={t`Radius`}
      suffix=" px"
      min={1}
      max={40}
      value={symbology.radius}
      onChange={(value) => {
        if (!isNumber(value)) {
          return;
        }
        onLayerChange((current) => {
          return MapLayerUpdates.withCircleRadius({
            layer: current,
            radius: value,
          });
        });
      }}
    />
  );
}
