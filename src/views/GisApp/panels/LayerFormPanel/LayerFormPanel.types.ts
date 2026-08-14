import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/** Applies an immutable update to the active map layer. */
export type LayerChangeHandler = (
  update: (current: MapLayer.T) => MapLayer.T,
) => void;
