import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

import { HeatmapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/HeatmapLegend/HeatmapLegend";
import { FlatLegendEntry } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/FlatLegendEntry";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/MapLegendGroup.module.css";
import { SizedLegendContent } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/SizedLegendContent";
import { StandardLegendContent } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/StandardLegendContent";

type Props = { layer: MapLayer.T };

/** Picks the legend form that matches the layer's active symbology. */
export function LayerLegendContent({ layer }: Props): ReactNode {
  if (layer.symbology.type === "heatmap") {
    return <HeatmapLegend ramp={layer.symbology.ramp} />;
  }
  if (layer.symbology.type === "cluster") {
    return (
      <ul className={css.mapLegendGroupList}>
        <FlatLegendEntry
          color={layer.symbology.color.color}
          entryLabel={layer.name}
          showNoData={false}
        />
      </ul>
    );
  }
  if (
    layer.symbology.type === "proportionalSymbol" &&
    layer.legend.sizeStops.length > 0
  ) {
    return <SizedLegendContent layer={layer} />;
  }
  return <StandardLegendContent layer={layer} />;
}
