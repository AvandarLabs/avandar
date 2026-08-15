import { useLingui } from "@lingui/react/macro";
import { ColorInput, TextInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/layers/MapLayerUpdates/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerInspector/LayerInspector";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Edits up to three named categories plus the Other fallback. */
export function CategoricalControls(props: Props): ReactNode {
  const { t } = useLingui();
  const color = props.layer.symbology.color;
  if (color.type !== "categorical") {
    return null;
  }
  const update = (nextColor: typeof color): void => {
    props.onLayerChange((current) => {
      return MapLayerUpdates.withLayerColor(current, nextColor);
    });
  };
  return (
    <>
      {color.categories.slice(0, 3).map((category, index) => {
        return (
          <TextInput
            key={index}
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
