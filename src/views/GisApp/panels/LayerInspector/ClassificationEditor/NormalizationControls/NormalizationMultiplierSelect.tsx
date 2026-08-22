import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Select } from "@mantine/core";

import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";

type Props = {
  multiplier: 1 | 1_000 | 100_000;
  onLayerChange: LayerChangeHandler;
};

function _applyMultiplierChange(options: {
  value: string | null;
  onLayerChange: LayerChangeHandler;
}): void {
  const { value, onLayerChange } = options;
  if (!value) {
    return;
  }
  onLayerChange((current) => {
    if (current.symbology.type === "heatmap") {
      return current;
    }
    const currentColor = current.symbology.color;
    if (currentColor.type !== "graduated" || !currentColor.normalization) {
      return current;
    }
    return MapLayerUpdates.withLayerColor({
      layer: current,
      color: {
        ...currentColor,
        normalization: {
          ...currentColor.normalization,
          multiplier: Number(value) as 1 | 1_000 | 100_000,
        },
      },
    });
  });
}

/** Selects the per-unit multiplier applied after normalization. */
export function NormalizationMultiplierSelect({
  multiplier,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  return (
    <Select
      label={t`Per`}
      data={[
        { value: "1", label: t`1` },
        { value: "1000", label: t`1,000` },
        { value: "100000", label: t`100,000` },
      ]}
      value={String(multiplier)}
      allowDeselect={false}
      onChange={(value) => {
        _applyMultiplierChange({ value, onLayerChange });
      }}
    />
  );
}
