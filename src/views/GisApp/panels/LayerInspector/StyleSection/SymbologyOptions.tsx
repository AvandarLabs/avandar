import css from "@/views/GisApp/panels/LayerInspector/StyleSection/StyleSection.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

const OPTIONS = [
  { type: "circle", isAvailable: true },
  { type: "proportionalSymbol", isAvailable: true },
  { type: "cluster", isAvailable: false },
  { type: "heatmap", isAvailable: false },
] as const;

type AvailableType = Extract<
  (typeof OPTIONS)[number],
  { isAvailable: true }
>["type"];
type OptionType = (typeof OPTIONS)[number]["type"];

type Props = {
  activeType: MapLayer.Symbology["type"];
  labels: Readonly<Record<OptionType, string>>;
  onTypeChange: (type: AvailableType) => void;
};

/** Renders available and unavailable symbology choices. */
export function SymbologyOptions(props: Props): ReactNode {
  const { activeType, labels, onTypeChange } = props;
  return OPTIONS.map((option) => {
    return (
      <button
        className={css.styleSectionSegmentedItem}
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
