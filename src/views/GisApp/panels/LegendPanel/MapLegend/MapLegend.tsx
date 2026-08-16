import { propNotEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.module.css";
import { MapLegendGroup } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/MapLegendGroup";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  /** Visible layers in panel row order, so the legend reads top down. */
  layers: readonly MapLayer.T[];
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

/**
 * Renders one legend group per layer whose persisted position is not hidden.
 *
 * Each group selects the legend form for its active layer symbology.
 */
export function MapLegend({
  layers,
  isCollapsed,
  onToggleCollapsed,
}: Props): ReactNode {
  const { t } = useLingui();
  const shown = layers.filter(propNotEq("legend.position", "hidden"));

  if (shown.length === 0) {
    return null;
  }

  return (
    <MapChromePanel
      variant="legend"
      id="gis-legend"
      title={t`Legend`}
      isCollapsed={isCollapsed}
      onToggleCollapsed={onToggleCollapsed}
      collapseLabel={t`Collapse the legend`}
      expandLabel={t`Expand the legend`}
    >
      <div className={css.mapLegendBody}>
        {shown.map((layer) => {
          return <MapLegendGroup key={layer.id} layer={layer} />;
        })}
      </div>
    </MapChromePanel>
  );
}
