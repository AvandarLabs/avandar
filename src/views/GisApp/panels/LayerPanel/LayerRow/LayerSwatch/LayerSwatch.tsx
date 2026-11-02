import clsx from "clsx";
import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerSwatch/LayerSwatch.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { symbology: MapLayer.Symbology };

/** Shows a miniature of the layer's point or proportional symbol. */
export function LayerSwatch({ symbology }: Props): ReactNode {
  const variantClassName =
    symbology.type === "circle"
      ? css["layerSwatch--point"]
      : symbology.type === "proportionalSymbol"
        ? css["layerSwatch--sized"]
        : undefined;
  if (symbology.type === "heatmap") {
    return (
      <span
        aria-hidden
        className={clsx(css.layerSwatch, variantClassName)}
        style={{ backgroundColor: symbology.ramp.at(-1) }}
      />
    );
  }
  const color = symbology.color;
  const swatchColor =
    color.type === "single"
      ? color.color
      : color.type === "graduated"
        ? color.ramp[0]
        : (color.categories[0]?.color ?? color.other.color);

  return (
    <span
      aria-hidden
      className={clsx(css.layerSwatch, variantClassName)}
      style={{ backgroundColor: swatchColor }}
    />
  );
}
