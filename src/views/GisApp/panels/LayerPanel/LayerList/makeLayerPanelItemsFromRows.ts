import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** A data-layer row or the pinned annotation overlay. */
export type LayerPanelItem =
  | { type: "layer"; layer: MapLayer.T }
  | { type: "annotations" };

/**
 * Returns top-first layer-panel rows, including the annotation overlay row
 * when any annotation feature exists.
 */
export function makeLayerPanelItemsFromRows(options: {
  rows: readonly MapLayer.T[];
  annotations?: AvaMapConfig.AnnotationLayer;
  annotationsZIndex?: number;
}): LayerPanelItem[] {
  const items: LayerPanelItem[] = options.rows.map((layer) => {
    return { type: "layer", layer };
  });
  if ((options.annotations?.features.length ?? 0) === 0) {
    return items;
  }
  const annotationsZIndex = options.annotationsZIndex ?? items.length;
  // Overlay row index is `layers.length - annotationsZIndex`.
  const insertAt = Math.min(
    items.length,
    Math.max(0, items.length - annotationsZIndex),
  );
  return [
    ...items.slice(0, insertAt),
    { type: "annotations" },
    ...items.slice(insertAt),
  ];
}
