import type { GeoBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import type { GeometryBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeometryBindingGuessFromColumns";

/**
 * The binding a layer should gain from column names and sampled geometry.
 */
export type MapBindingAction =
  | {
      type: "latLngColumns";
      latitudeColumnName: string;
      longitudeColumnName: string;
    }
  | { type: "geometryColumn"; guess: GeometryBindingGuess };

/**
 * What the layer already has, plus the two guesses, when a default is chosen.
 */
export type MapBindingDecisionInput = {
  hasLatLngAxis: boolean;
  hasNonLatLngBinding: boolean;
  boundGeometryColumnName: string | undefined;
  boundGeometryColumnHasGeometryValue: boolean;
  latLngGuess: GeoBindingGuess | undefined;
  geometryGuess: GeometryBindingGuess | undefined;
  isGeometrySampleSettled: boolean;
  isSpatialUnavailable: boolean;
  isAggregateOnly: boolean;
};

function _latLngAction(guess: GeoBindingGuess): MapBindingAction {
  return {
    type: "latLngColumns",
    latitudeColumnName: guess.latitudeColumnName,
    longitudeColumnName: guess.longitudeColumnName,
  };
}

function _geometryAction(
  input: MapBindingDecisionInput,
): MapBindingAction | undefined {
  const { geometryGuess } = input;
  if (!geometryGuess || input.isSpatialUnavailable) {
    return undefined;
  }
  if (input.isAggregateOnly && geometryGuess.family !== "polygon") {
    return undefined;
  }
  return { type: "geometryColumn", guess: geometryGuess };
}

function _replacementGeometryAction(
  input: MapBindingDecisionInput,
): MapBindingAction | undefined {
  if (!input.isGeometrySampleSettled) {
    return undefined;
  }
  if (
    input.boundGeometryColumnName === input.geometryGuess?.columnName ||
    input.boundGeometryColumnHasGeometryValue
  ) {
    return undefined;
  }
  return _geometryAction(input);
}

/**
 * Chooses the geometry binding to apply when a layer has none, or replaces a
 * geometry binding whose column holds no geometry.
 *
 * A high-confidence latitude and longitude pair wins without waiting. A
 * sampled geometry column wins over an `x` and `y` name match. Used when a
 * map layer is first pointed at a dataset.
 */
export function decideMapBindingAction(
  input: MapBindingDecisionInput,
): MapBindingAction | undefined {
  if (input.hasLatLngAxis) {
    return undefined;
  }
  if (
    input.hasNonLatLngBinding &&
    input.boundGeometryColumnName === undefined
  ) {
    return undefined;
  }
  if (input.boundGeometryColumnName !== undefined) {
    return _replacementGeometryAction(input);
  }
  if (input.latLngGuess?.confidence === "high") {
    return _latLngAction(input.latLngGuess);
  }
  if (!input.isGeometrySampleSettled) {
    return undefined;
  }
  const geometryAction = _geometryAction(input);
  if (geometryAction) {
    return geometryAction;
  }
  return input.latLngGuess ? _latLngAction(input.latLngGuess) : undefined;
}
