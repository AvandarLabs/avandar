import { useLingui } from "@lingui/react/macro";
import { ColorInput } from "@mantine/core";
import { MapLayerUpdates } from "@/views/GisApp/panels/LayerFormPanel/MapLayerUpdates";
import type { LayerChangeHandler } from "@/views/GisApp/panels/LayerFormPanel/LayerFormPanel.types";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

/** Palette offered by the symbol-color picker. */
const SYMBOL_COLOR_SWATCHES = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

type Props = { layer: MapLayer.T; onLayerChange: LayerChangeHandler };

/** Selects the flat color used to paint the active layer's symbols. */
export function LayerSymbolColorField({
  layer,
  onLayerChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  return (
    <ColorInput
      label={t`Symbol color`}
      value={layer.symbology.color.color}
      onChange={(color) => {
        onLayerChange((current) => {
          return MapLayerUpdates.withSymbolColor(current, color);
        });
      }}
      popoverProps={{ withinPortal: false }}
      format="hex"
      swatches={SYMBOL_COLOR_SWATCHES}
    />
  );
}
