import { describe, expect, it } from "vitest";
import { decideMapBindingAction } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/decideMapBindingAction";
import type { GeoBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";
import type { GeometryBindingGuess } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeometryBindingGuessFromColumns";

const LAT_LNG: GeoBindingGuess = {
  latitudeColumnName: "latitude",
  longitudeColumnName: "longitude",
  confidence: "high",
};

const XY: GeoBindingGuess = {
  latitudeColumnName: "y",
  longitudeColumnName: "x",
  confidence: "low",
};

const LOCATION: GeometryBindingGuess = {
  columnName: "location",
  encoding: "wkt",
  family: "point",
  sourceCrs: undefined,
};

const UNBOUND = {
  hasLatLngAxis: false,
  hasNonLatLngBinding: false,
  boundGeometryColumnName: undefined,
  boundGeometryColumnHasGeometryValue: false,
  isGeometrySampleSettled: true,
  isSpatialUnavailable: false,
  isAggregateOnly: false,
};

describe("decideMapBindingAction", () => {
  it("uses a high-confidence latitude and longitude pair without waiting for samples", () => {
    expect(
      decideMapBindingAction({
        ...UNBOUND,
        latLngGuess: LAT_LNG,
        geometryGuess: LOCATION,
        isGeometrySampleSettled: false,
      }),
    ).toEqual({
      type: "latLngColumns",
      latitudeColumnName: "latitude",
      longitudeColumnName: "longitude",
    });
  });

  it("uses a location point column when no coordinate pair is present", () => {
    expect(
      decideMapBindingAction({
        ...UNBOUND,
        latLngGuess: undefined,
        geometryGuess: LOCATION,
      }),
    ).toEqual({ type: "geometryColumn", guess: LOCATION });
  });

  it("prefers a proven geometry column over an x and y name match", () => {
    expect(
      decideMapBindingAction({
        ...UNBOUND,
        latLngGuess: XY,
        geometryGuess: LOCATION,
      })?.type,
    ).toBe("geometryColumn");
  });

  it("waits to bind x and y until the geometry sample has settled", () => {
    expect(
      decideMapBindingAction({
        ...UNBOUND,
        latLngGuess: XY,
        geometryGuess: undefined,
        isGeometrySampleSettled: false,
      }),
    ).toBeUndefined();
  });

  it("does not bind point geometry on an aggregate-only layer", () => {
    expect(
      decideMapBindingAction({
        ...UNBOUND,
        isAggregateOnly: true,
        latLngGuess: undefined,
        geometryGuess: LOCATION,
      }),
    ).toBeUndefined();
  });

  it("replaces a non-geometry column left on a geometry binding", () => {
    expect(
      decideMapBindingAction({
        ...UNBOUND,
        hasNonLatLngBinding: true,
        boundGeometryColumnName: "school_name",
        boundGeometryColumnHasGeometryValue: false,
        latLngGuess: undefined,
        geometryGuess: LOCATION,
      }),
    ).toEqual({ type: "geometryColumn", guess: LOCATION });
  });

  it("leaves a geometry column the user already bound", () => {
    expect(
      decideMapBindingAction({
        ...UNBOUND,
        hasNonLatLngBinding: true,
        boundGeometryColumnName: "wkt",
        boundGeometryColumnHasGeometryValue: true,
        latLngGuess: undefined,
        geometryGuess: LOCATION,
      }),
    ).toBeUndefined();
  });
});
