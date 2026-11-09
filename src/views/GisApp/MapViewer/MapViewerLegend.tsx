import { prop } from "@avandar/utils";
import { useMemo, useState } from "react";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import css from "@/views/GisApp/MapViewer/MapViewer.module.css";
import { MapLegend } from "@/views/GisApp/panels/LegendPanel/MapLegend/MapLegend";
import type { ReactNode } from "react";

type Props = { config: AvaMapConfig.T; hasDrawnDisputedFeature: boolean };

/** The GIS legend, floating over a read-only map's canvas. */
export function MapViewerLegend({
  config,
  hasDrawnDisputedFeature,
}: Props): ReactNode {
  const [isCollapsed, setIsCollapsed] = useState(false);
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
