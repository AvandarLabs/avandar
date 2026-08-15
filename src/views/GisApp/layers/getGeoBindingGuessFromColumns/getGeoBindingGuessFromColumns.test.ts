import { describe, expect, it } from "vitest";
import { getGeoBindingGuessFromColumns } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/getGeoBindingGuessFromColumns";

/** A column as the guesser sees it: a name and whether it holds numbers. */
function _column(
  name: string,
  isNumeric = true,
): { name: string; isNumeric: boolean } {
  return { name, isNumeric };
}

describe("getGeoBindingGuessFromColumns", () => {
  it("matches the common short names", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column("id", false),
        _column("lat"),
        _column("lon"),
      ]),
    ).toEqual({ latitudeColumnName: "lat", longitudeColumnName: "lon" });
  });

  it("matches case insensitively and ignores surrounding punctuation", () => {
    expect(
      getGeoBindingGuessFromColumns([_column("Lat"), _column("Long_")]),
    ).toEqual({ latitudeColumnName: "Lat", longitudeColumnName: "Long_" });
  });

  it("never matches on a substring", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column("lat_updated_at"),
        _column("longitude"),
      ]),
    ).toBeUndefined();
  });

  it("returns nothing when only one axis matches", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column("latitude"),
        _column("name", false),
      ]),
    ).toBeUndefined();
  });

  it("ignores a matching name whose column is not numeric", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column("latitude", false),
        _column("longitude"),
      ]),
    ).toBeUndefined();
  });

  it("prefers the first match when several columns qualify", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column("y"),
        _column("latitude"),
        _column("x"),
      ]),
    ).toEqual({ latitudeColumnName: "y", longitudeColumnName: "x" });
  });
});
