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
    ).toEqual({ latitudeColumnName: "lat", longitudeColumnName: "lon" });
  });

  it("matches case insensitively and ignores surrounding punctuation", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "Lat" }),
        _column({ name: "Long_" }),
      ]),
    ).toEqual({ latitudeColumnName: "Lat", longitudeColumnName: "Long_" });
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

  it("prefers the first match when several columns qualify", () => {
    expect(
      getGeoBindingGuessFromColumns([
        _column({ name: "y" }),
        _column({ name: "latitude" }),
        _column({ name: "x" }),
      ]),
    ).toEqual({ latitudeColumnName: "y", longitudeColumnName: "x" });
  });
});
