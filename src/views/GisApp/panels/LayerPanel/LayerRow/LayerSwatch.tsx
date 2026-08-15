import clsx from "clsx";
import { match } from "ts-pattern";
import css from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerSwatch.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { symbology: MapLayer.Symbology };

/** Shows a miniature of the layer's point or proportional symbol. */
export function LayerSwatch({ symbology }: Props): ReactNode {
  const variantClassName = match(symbology)
    .with({ type: "circle" }, () => {
      return css["layerSwatch--point"];
    })
    .with({ type: "proportionalSymbol" }, () => {
      return css["layerSwatch--sized"];
    })
    .exhaustive();

  return (
    <span
      aria-hidden
      className={clsx(css.layerSwatch, variantClassName)}
      style={{ backgroundColor: symbology.color.color }}
    />
  );
}
