import { useLingui } from "@lingui/react/macro";
import { ColorInput, TextInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

function _getCategoryKey(category: { value: string }, index: number): string {
  return category.value === "" ? `empty-${index}` : category.value;
}

/** Edits up to three named categories plus the Other fallback. */
export function CategoricalControls({
  layer,
  onLayerChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const { symbology } = layer;
  if (symbology.type === "heatmap" || symbology.color.type !== "categorical") {
    return null;
  }
  const color = symbology.color;
  const update = (nextColor: typeof color): void => {
    onLayerChange((current) => {
      return MapLayerUpdates.withLayerColor({
        layer: current,
        color: nextColor,
      });
    });
  };
  const visibleCategories = color.categories.slice(0, 3);
  return (
    <>
      {visibleCategories.map((category, index) => {
        return (
          <TextInput
            key={_getCategoryKey(category, index)}
            label={t`Category ${index + 1}`}
            value={category.value}
            onChange={(event) => {
              const categories = color.categories.map(
                (current, currentIndex) => {
                  return currentIndex === index ?
                      { ...current, value: event.currentTarget.value }
                    : current;
                },
              );
              update({ ...color, categories });
            }}
          />
        );
      })}
      <ColorInput
        label={t`Other color`}
        value={color.other.color}
        onChange={(otherColor) => {
          update({ ...color, other: { ...color.other, color: otherColor } });
        }}
      />
    </>
  );
}
