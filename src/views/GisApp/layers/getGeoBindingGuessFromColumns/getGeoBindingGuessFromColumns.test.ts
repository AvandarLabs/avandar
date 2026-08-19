import { describe, expect, it } from "vitest";
import { getGeoBindingGuessFromColumns } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";

/** A column as the guesser sees it: a name and whether it holds numbers. */
function _column({
  name,
  isNumeric = true,
}: Readonly<{
  name: string;
  isNumeric?: boolean;
}>): { name: string; isNumeric: boolean } {
  return { name, isNumeric };
}

describe("getGeoBindingGuessFromColumns", () => {
  it("matches the common short names", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "id", isNumeric: false }),
        _column({ name: "lat" }),
        _column({ name: "lon" }),
      ]),
    ).toEqual({
      latitudeColumnName: "lat",
      longitudeColumnName: "lon",
      confidence: "high",
    });
  });

  it("matches case insensitively after stripping leading and trailing punctuation", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "_Lat" }),
        _column({ name: "Long_" }),
      ]),
    ).toEqual({
      latitudeColumnName: "_Lat",
      longitudeColumnName: "Long_",
      confidence: "high",
    });
  });

  it("still matches when both names are mixed case with trailing punctuation", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "LATITUDE" }),
        _column({ name: "Longitude." }),
      ]),
    ).toEqual({
      latitudeColumnName: "LATITUDE",
      longitudeColumnName: "Longitude.",
      confidence: "high",
    });
  });

  it("never matches on a substring", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "lat_updated_at" }),
        _column({ name: "longitude" }),
      ]),
    ).toBeUndefined();
  });

  it("returns nothing when only one axis matches", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "latitude" }),
        _column({ name: "name", isNumeric: false }),
      ]),
    ).toBeUndefined();
  });

  it("ignores a matching name whose column is not numeric", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "latitude", isNumeric: false }),
        _column({ name: "longitude" }),
      ]),
    ).toBeUndefined();
  });

  it("prefers high-confidence names over x and y", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "y" }),
        _column({ name: "latitude" }),
        _column({ name: "x" }),
        _column({ name: "longitude" }),
      ]),
    ).toEqual({
      latitudeColumnName: "latitude",
      longitudeColumnName: "longitude",
      confidence: "high",
    });
  });

  it("matches x and y as a low-confidence pair", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "y" }),
        _column({ name: "x" }),
      ]),
    ).toEqual({
      latitudeColumnName: "y",
      longitudeColumnName: "x",
      confidence: "low",
    });
  });

  it("matches coord_y and coord_x as a low-confidence pair", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "coord_y" }),
        _column({ name: "coord_x" }),
      ]),
    ).toEqual({
      latitudeColumnName: "coord_y",
      longitudeColumnName: "coord_x",
      confidence: "low",
    });
  });

  it("matches coordy and coordx as a low-confidence pair", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "coordy" }),
        _column({ name: "coordx" }),
      ]),
    ).toEqual({
      latitudeColumnName: "coordy",
      longitudeColumnName: "coordx",
      confidence: "low",
    });
  });
});
