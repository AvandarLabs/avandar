import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { AvailableSymbologyType } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.constants";
import type { ReactNode } from "react";

import { SYMBOLOGY_OPTIONS } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.constants";
import css from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.module.css";

type Props = {
  activeType: MapLayer.Symbology["type"];
  labels: Readonly<Record<(typeof SYMBOLOGY_OPTIONS)[number]["type"], string>>;
  isOptionAvailable: (type: AvailableSymbologyType) => boolean;
  onTypeChange: (type: AvailableSymbologyType) => void;
};

/** Renders available and unavailable symbology choices. */
export function SymbologyOptions({
  activeType,
  labels,
  isOptionAvailable,
  onTypeChange,
}: Props): ReactNode {
  return SYMBOLOGY_OPTIONS.map((option) => {
    const isAvailable = isOptionAvailable(option.type);
    return (
      <button
        className={css.symbologyOptionsItem}
        key={option.type}
        type="button"
        aria-pressed={option.type === activeType}
        aria-disabled={!isAvailable || undefined}
        aria-describedby={isAvailable ? undefined : "gis-symbology-hint"}
        onClick={() => {
          if (isAvailable) {
            onTypeChange(option.type);
          }
        }}
      >
        {labels[option.type]}
      </button>
    );
  });
}
