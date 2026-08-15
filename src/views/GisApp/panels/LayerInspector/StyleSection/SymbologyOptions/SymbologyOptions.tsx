import { SYMBOLOGY_OPTIONS } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.constants";
import css from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.module.css";
import type { AvailableSymbologyType } from "@/views/GisApp/panels/LayerInspector/StyleSection/SymbologyOptions/SymbologyOptions.constants";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  activeType: MapLayer.Symbology["type"];
  labels: Readonly<Record<(typeof SYMBOLOGY_OPTIONS)[number]["type"], string>>;
  onTypeChange: (type: AvailableSymbologyType) => void;
};

/** Renders available and unavailable symbology choices. */
export function SymbologyOptions({
  activeType,
  labels,
  onTypeChange,
}: Props): ReactNode {
  return SYMBOLOGY_OPTIONS.map((option) => {
    return (
      <button
        className={css.symbologyOptionsItem}
        key={option.type}
        type="button"
        aria-pressed={option.type === activeType}
        aria-disabled={!option.isAvailable || undefined}
        aria-describedby={option.isAvailable ? undefined : "gis-symbology-hint"}
        onClick={() => {
          if (option.isAvailable) {
            onTypeChange(option.type);
          }
        }}
      >
        {labels[option.type]}
      </button>
    );
  });
}
