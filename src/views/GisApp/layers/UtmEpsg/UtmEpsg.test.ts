import { describe, expect, it } from "vitest";

import { UtmEpsg } from "./UtmEpsg";

describe("UtmEpsg.fromLongitudeLatitude", () => {
  it("returns UTM south EPSG for Kinshasa", () => {
    expect(
      UtmEpsg.fromLongitudeLatitude({ longitude: 15.2663, latitude: -4.4419 }),
    ).toBe(32733);
  });

  it("returns UTM north EPSG for Oslo", () => {
    expect(
      UtmEpsg.fromLongitudeLatitude({ longitude: 10.7522, latitude: 59.9139 }),
    ).toBe(32632);
  });

  it("returns north polar EPSG at the north pole", () => {
    expect(UtmEpsg.fromLongitudeLatitude({ longitude: 0, latitude: 90 })).toBe(
      32661,
    );
  });
});
