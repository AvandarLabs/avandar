import { areaBindingUpdates } from "./areaBindingUpdates";
import { geometryBindingUpdates } from "./geometryBindingUpdates";
import { layerMetaUpdates } from "./layerMetaUpdates";
import { queryPopupUpdates } from "./queryPopupUpdates";
import { symbologyPaintUpdates } from "./symbologyPaintUpdates";
import { symbologyTypeUpdates } from "./symbologyTypeUpdates";

/**
 * Immutable updates to a map layer, driven by the layer inspector.
 *
 * Every updater returns the layer it was given, unchanged by reference, when
 * there is nothing to change. The inspector relies on that: an equal-but-new
 * layer would re-render the map on every keystroke.
 */
export const MapLayerUpdates = {
  ...queryPopupUpdates,
  ...geometryBindingUpdates,
  ...areaBindingUpdates,
  ...symbologyTypeUpdates,
  ...symbologyPaintUpdates,
  ...layerMetaUpdates,
};
