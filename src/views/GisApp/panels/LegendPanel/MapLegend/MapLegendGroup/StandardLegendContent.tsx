import { useLingui } from "@lingui/react/macro";
import { FlatLegendEntry } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/FlatLegendEntry";
import { LegendEntries } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/LegendEntries";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/MapLegendGroup.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T };

/** Renders classified keys, or a single-color row when none exist. */
export function StandardLegendContent({ layer }: Props): ReactNode {
  const { t } = useLingui();
  const color =
    layer.symbology.type !== "heatmap" &&
    layer.symbology.color.type === "single"
      ? layer.symbology.color.color
      : undefined;
  return (
    <ul className={css.mapLegendGroupList}>
      {layer.legend.entries.length > 0 ? (
        <LegendEntries
          entries={layer.legend.entries}
          showNoData={layer.legend.showNoData}
        />
      ) : (
        <FlatLegendEntry
          color={color}
          entryLabel={
            layer.symbology.type === "proportionalSymbol"
              ? t`Sized by value`
              : layer.name
          }
          showNoData={layer.legend.showNoData}
        />
      )}
    </ul>
  );
}
