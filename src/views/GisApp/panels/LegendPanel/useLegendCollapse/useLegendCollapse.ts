import { useState } from "react";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

type Options = {
  /** The legend's saved collapse state. */
  isPanelCollapsed: boolean;
  /** Flips the saved collapse state. */
  onTogglePanel: () => void;
  /** The layer whose feature list is open, if any. */
  openFeatureListLayerId: MapLayer.Id | undefined;
};

/**
 * Whether the map legend is collapsed, and how to toggle it. While a feature
 * list is open the drawer shortens the map, so the legend collapses to its
 * header to stay clear of the layer list. Expanding it then lasts only for
 * that list and never changes the saved state, which comes back as soon as
 * the list closes. Used by `GisAppMapLegend`.
 */
export function useLegendCollapse({
  isPanelCollapsed,
  onTogglePanel,
  openFeatureListLayerId,
}: Options): { isCollapsed: boolean; onToggleCollapsed: () => void } {
  const [expandedOverListId, setExpandedOverListId] = useState<MapLayer.Id>();
  if (!openFeatureListLayerId) {
    return { isCollapsed: isPanelCollapsed, onToggleCollapsed: onTogglePanel };
  }
  const isCollapsed = expandedOverListId !== openFeatureListLayerId;
  return {
    isCollapsed,
    onToggleCollapsed: () => {
      setExpandedOverListId(isCollapsed ? openFeatureListLayerId : undefined);
    },
  };
}
