import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { isNumber } from "@avandar/utils";
import { NumberInput } from "@mantine/core";

type Props = {
  label: string;
  value: number;
  onLayerChange: LayerChangeHandler;
  apply: (layer: MapLayer.T, radius: number) => MapLayer.T;
};

/** Edits one radius bound for a sized-symbol layer. */
export function ProportionalRadiusInput({
  label,
  value,
  onLayerChange,
  apply,
}: Props): ReactNode {
  return (
    <NumberInput
      label={label}
      suffix=" px"
      min={2}
      max={80}
      value={value}
      onChange={(nextValue) => {
        if (!isNumber(nextValue)) {
          return;
        }
        onLayerChange((current) => {
          return apply(current, nextValue);
        });
      }}
    />
  );
}
