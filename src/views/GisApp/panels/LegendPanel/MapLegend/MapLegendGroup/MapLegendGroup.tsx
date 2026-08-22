import { useLingui } from "@lingui/react/macro";
import { LayerLegendContent } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/LayerLegendContent";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/MapLegendGroup.module.css";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = { layer: MapLayer.T };

/** Renders one layer's title, units, and symbology-specific legend form. */
export function MapLegendGroup({ layer }: Props): ReactNode {
  const { t } = useLingui();
  const title = layer.legend.title.trim() || layer.name.trim() || t`Legend`;
  return (
    <div className={css.mapLegendGroup}>
      <h3 className={css.mapLegendGroupTitle}>{title}</h3>
      {layer.legend.units ? (
        <div className={css.mapLegendGroupUnits}>{layer.legend.units}</div>
      ) : null}
      <LayerLegendContent layer={layer} />
    </div>
  );
}
