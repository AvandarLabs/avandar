import { prop } from "@avandar/utils";
import { useMemo, useState } from "react";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import { MapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend";
import type { ReactNode } from "react";

/**
 * Maps shorter than this, in pixels, open with the legend collapsed to its
 * header, so it leaves the map visible, the same way the GIS app collapses
 * its legend while a feature list shortens the map.
 */
export const MAP_VIEWER_SHORT_MAP_MAX_HEIGHT_PX = 320;

type Props = {
  config: AvaMapConfig.T;
  hasDrawnDisputedFeature: boolean;

  /** The map's height, which decides whether the legend starts collapsed. */
  heightPx: number;
};

/**
 * The GIS legend, floating over a read-only map's canvas. It starts collapsed
 * on a short map. Callers key it by that, so a reader's toggle lasts until the
 * map crosses the threshold.
 */
export function MapViewerLegend({
  config,
  hasDrawnDisputedFeature,
  heightPx,
}: Props): ReactNode {
  const [isCollapsed, setIsCollapsed] = useState(
    heightPx < MAP_VIEWER_SHORT_MAP_MAX_HEIGHT_PX,
  );
  const layers = useMemo(() => {
    return AvaMapConfig.toStackOrder(config).filter(prop("isVisible"));
  }, [config]);
  return (
    <div className={css.mapViewerLegend}>
      <MapLegend
        layers={layers}
        hasDrawnDisputedFeature={hasDrawnDisputedFeature}
        isCollapsed={isCollapsed}
        onToggleCollapsed={() => {
          setIsCollapsed((current) => {
            return !current;
          });
        }}
      />
    </div>
  );
}
