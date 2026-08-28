import { propNotEq } from "@avandar/utils";
import { useLingui } from "@lingui/react/macro";
import { DisputedLegendRow } from "@/views/GisApp/panels/LegendPanel/MapLegend/DisputedLegendRow/DisputedLegendRow";
import css from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend.module.css";
import { MapLegendGroup } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegendGroup/MapLegendGroup";
import { MapChromePanel } from "@/views/GisApp/shell/MapChromePanel/MapChromePanel";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ReactNode } from "react";

type Props = {
  /** Visible layers in panel row order, so the legend reads top down. */
  layers: readonly MapLayer.T[];
  /** True when at least one drawn feature is disputed or undetermined. */
  hasDrawnDisputedFeature: boolean;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

/**
 * Renders one legend group per layer whose persisted position is not hidden,
 * plus the locked disputed-boundary row when one is required.
 *
 * The panel must still render when every layer's own legend is hidden but a
 * disputed or undetermined boundary is drawn: that row can never be
 * suppressed by any author control, so its presence cannot depend on whether
 * any ordinary legend group is shown.
 */
export function MapLegend({
  layers,
  hasDrawnDisputedFeature,
  isCollapsed,
  onToggleCollapsed,
}: Props): ReactNode {
  const { t } = useLingui();
  const shown = layers.filter(propNotEq("legend.position", "hidden"));

  if (shown.length === 0 && !hasDrawnDisputedFeature) {
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
        {hasDrawnDisputedFeature ? <DisputedLegendRow /> : null}
      </div>
    </MapChromePanel>
  );
}
