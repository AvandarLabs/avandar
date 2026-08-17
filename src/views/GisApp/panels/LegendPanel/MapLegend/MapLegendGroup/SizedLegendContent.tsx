import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/MapLegendGroup.module.css";
import { LegendEntries } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/LegendEntries";
import { SizeLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/SizeLegend/SizeLegend";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T };

/** Renders a size ramp beside classified color keys. */
export function SizedLegendContent({ layer }: Props): ReactNode {
  return (
    <div className={css.mapLegendGroupSized}>
      <SizeLegend sizeStops={layer.legend.sizeStops} />
      {layer.legend.entries.length > 0 ?
        <ul className={css.mapLegendGroupList}>
          <LegendEntries
            entries={layer.legend.entries}
            showNoData={layer.legend.showNoData}
          />
        </ul>
      : null}
    </div>
  );
}
