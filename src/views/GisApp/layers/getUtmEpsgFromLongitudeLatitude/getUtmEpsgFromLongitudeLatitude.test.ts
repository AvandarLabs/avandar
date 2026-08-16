import { describe, expect, it } from "vitest";
import { getUtmEpsgFromLongitudeLatitude } from "@/views/GisApp/layers/getUtmEpsgFromLongitudeLatitude/getUtmEpsgFromLongitudeLatitude";

describe("getUtmEpsgFromLongitudeLatitude", () => {
  it("returns UTM south EPSG for Kinshasa", () => {
    expect(getUtmEpsgFromLongitudeLatitude(15.2663, -4.4419)).toBe(32733);
  });

  it("returns UTM north EPSG for Oslo", () => {
    expect(getUtmEpsgFromLongitudeLatitude(10.7522, 59.9139)).toBe(32632);
  });

  it("returns north polar EPSG at the north pole", () => {
    expect(getUtmEpsgFromLongitudeLatitude(0, 90)).toBe(32661);
  });
});
