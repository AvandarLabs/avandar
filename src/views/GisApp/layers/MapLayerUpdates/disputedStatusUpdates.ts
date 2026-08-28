import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

/**
 * Binds or clears the layer's disputed-status column.
 *
 * Binding always resets the assigned values, because a value observed under
 * one column has no established meaning under another. Binding is refused on
 * a layer `MapLayer.canBindDisputedStatus` rejects, since only fill or line
 * symbology on a boundary binding can carry a disputed line.
 */
function _withDisputedStatusColumn(
  options: Readonly<{
    layer: MapLayer.T;
    reference: MapLayer.DisputedStatusRef | undefined;
  }>,
): MapLayer.T {
  const { layer, reference } = options;
  if (reference === undefined) {
    return layer.disputedStatusColumn === undefined
      ? layer
      : {
          ...layer,
          disputedStatusColumn: undefined,
          disputedStatusValues: MapLayer.emptyDisputedStatusValues,
        };
  }
  if (!MapLayer.canBindDisputedStatus(layer)) {
    return layer;
  }
  return {
    ...layer,
    disputedStatusColumn: reference,
    disputedStatusValues: MapLayer.emptyDisputedStatusValues,
  };
}

/**
 * Assigns source values to the disputed and undetermined lists.
 *
 * Rejects an assignment with no bound column, and rejects an overlapping
 * assignment, by returning the layer unchanged: one value cannot mean two
 * things, and silently dropping it from one list would hide the author's
 * mistake.
 */
function _withDisputedStatusValues(
  options: Readonly<{
    layer: MapLayer.T;
    values: MapLayer.DisputedStatusValues;
  }>,
): MapLayer.T {
  const { layer, values } = options;
  if (
    layer.disputedStatusColumn === undefined ||
    !MapLayer.areDisputedStatusValuesDisjoint(values)
  ) {
    return layer;
  }
  return { ...layer, disputedStatusValues: values };
}

/** Disputed-boundary bindings for the layer inspector. */
export const disputedStatusUpdates = {
  withDisputedStatusColumn: _withDisputedStatusColumn,
  withDisputedStatusValues: _withDisputedStatusValues,
};
