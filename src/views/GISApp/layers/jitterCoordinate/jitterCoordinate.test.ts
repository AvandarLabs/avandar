import { describe, expect, it } from "vitest";
import { jitterCoordinate } from "@/views/GISApp/layers/jitterCoordinate/jitterCoordinate";

const kinshasa = { longitude: 15.2663, latitude: -4.4419 };

describe("jitterCoordinate", () => {
  it("returns the same displacement for the same seed", () => {
    const first = jitterCoordinate({
      ...kinshasa,
      radiusMeters: 500,
      seed: "row-7",
    });
    const second = jitterCoordinate({
      ...kinshasa,
      radiusMeters: 500,
      seed: "row-7",
    });
    expect(first).toEqual(second);
  });

  it("returns different displacements for different seeds", () => {
    const first = jitterCoordinate({
      ...kinshasa,
      radiusMeters: 500,
      seed: "row-7",
    });
    const second = jitterCoordinate({
      ...kinshasa,
      radiusMeters: 500,
      seed: "row-8",
    });
    expect(first).not.toEqual(second);
  });

  it("stays within the requested radius", () => {
    const radiusMeters = 300;
    const metersPerDegreeLatitude = 111_320;
    for (let index = 0; index < 50; index += 1) {
      const jittered = jitterCoordinate({
        ...kinshasa,
        radiusMeters,
        seed: `row-${index}`,
      });
      const deltaLatitudeMeters =
        (jittered.latitude - kinshasa.latitude) * metersPerDegreeLatitude;
      const deltaLongitudeMeters =
        (jittered.longitude - kinshasa.longitude) *
        metersPerDegreeLatitude *
        Math.cos((kinshasa.latitude * Math.PI) / 180);
      const distanceMeters = Math.hypot(
        deltaLatitudeMeters,
        deltaLongitudeMeters,
      );
      expect(distanceMeters).toBeLessThanOrEqual(radiusMeters + 1);
    }
  });

  it("does not move the point when the radius is zero", () => {
    const jittered = jitterCoordinate({
      ...kinshasa,
      radiusMeters: 0,
      seed: "row-7",
    });
    expect(jittered).toEqual(kinshasa);
  });
});
