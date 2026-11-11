import { describe, expect, it } from "vitest";
import { jitterCoordinate } from "@/views/GisApp/layers/jitterCoordinate/jitterCoordinate";

const kinshasa = { longitude: 15.2663, latitude: -4.4419 };
const MAP_SALT = "8f14e45f-ceea-467a-9575-1a1c0c1e7f3b";
const OTHER_MAP_SALT = "0c5d1f2a-7b3e-4c69-9d8a-2f6e4b1a3c57";

/**
 * The displacement the previous, unkeyed scheme produced: an FNV-1a hash of
 * the public seed alone. Anyone holding a published snapshot could recompute
 * it, which is what the salt exists to prevent.
 */
function _jitterWithPublicSeedOnly(
  seed: string,
  radiusMeters: number,
): { longitude: number; latitude: number } {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const angleRadians = ((hash & 0xffff) / 0x10000) * 2 * Math.PI;
  const distanceMeters =
    Math.sqrt(((hash >>> 16) & 0xffff) / 0x10000) * radiusMeters;
  return {
    longitude:
      kinshasa.longitude +
      (distanceMeters * Math.cos(angleRadians)) /
        (111_320 * Math.cos((kinshasa.latitude * Math.PI) / 180)),
    latitude:
      kinshasa.latitude + (distanceMeters * Math.sin(angleRadians)) / 111_320,
  };
}

describe("jitterCoordinate", () => {
  it("returns the same displacement for the same seed", () => {
    const first = jitterCoordinate({
      ...kinshasa,
      radiusMeters: 500,
      salt: MAP_SALT,
      seed: "row-7",
    });
    const second = jitterCoordinate({
      ...kinshasa,
      radiusMeters: 500,
      salt: MAP_SALT,
      seed: "row-7",
    });
    expect(first).toEqual(second);
  });

  it("returns different displacements for different seeds", () => {
    const first = jitterCoordinate({
      ...kinshasa,
      radiusMeters: 500,
      salt: MAP_SALT,
      seed: "row-7",
    });
    const second = jitterCoordinate({
      ...kinshasa,
      radiusMeters: 500,
      salt: MAP_SALT,
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
        salt: MAP_SALT,
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
      salt: MAP_SALT,
      seed: "row-7",
    });
    expect(jittered).toEqual(kinshasa);
  });

  it("wraps a point crossing the antimeridian into [-180, 180]", () => {
    const nearAntimeridian = { longitude: 179.99, latitude: 0 };
    for (let index = 0; index < 50; index += 1) {
      const jittered = jitterCoordinate({
        ...nearAntimeridian,
        radiusMeters: 5000,
        salt: MAP_SALT,
        seed: `antimeridian-${index}`,
      });
      expect(jittered.longitude).toBeGreaterThanOrEqual(-180);
      expect(jittered.longitude).toBeLessThanOrEqual(180);
    }
  });

  it("keeps a high-latitude point within valid coordinate bounds", () => {
    const nearPole = { longitude: 0, latitude: 89.999 };
    for (let index = 0; index < 50; index += 1) {
      const jittered = jitterCoordinate({
        ...nearPole,
        radiusMeters: 500,
        salt: MAP_SALT,
        seed: `pole-${index}`,
      });
      expect(jittered.latitude).toBeGreaterThanOrEqual(-90);
      expect(jittered.latitude).toBeLessThanOrEqual(90);
      expect(jittered.longitude).toBeGreaterThanOrEqual(-180);
      expect(jittered.longitude).toBeLessThanOrEqual(180);
    }
  });

  // Protects the square-root in the radius fraction: without it, points
  // sample uniformly by radius rather than uniformly over the disc's area,
  // which would cluster roughly half of them inside the inner half-radius
  // instead of the ~25% that uniform-over-area sampling predicts.
  it("distributes points uniformly over the disc, not clustered near the center", () => {
    const radiusMeters = 300;
    const sampleCount = 500;
    let withinHalfRadiusCount = 0;
    for (let index = 0; index < sampleCount; index += 1) {
      const jittered = jitterCoordinate({
        ...kinshasa,
        radiusMeters,
        salt: MAP_SALT,
        seed: `distribution-${index}`,
      });
      const metersPerDegreeLatitude = 111_320;
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
      if (distanceMeters <= radiusMeters / 2) {
        withinHalfRadiusCount += 1;
      }
    }
    const shareWithinHalfRadius = withinHalfRadiusCount / sampleCount;
    expect(shareWithinHalfRadius).toBeGreaterThan(0.15);
    expect(shareWithinHalfRadius).toBeLessThan(0.35);
  });

  it("returns different displacements for the same seed under different salts", () => {
    const first = jitterCoordinate({
      ...kinshasa,
      radiusMeters: 500,
      salt: MAP_SALT,
      seed: "layer-1:0",
    });
    const second = jitterCoordinate({
      ...kinshasa,
      radiusMeters: 500,
      salt: OTHER_MAP_SALT,
      seed: "layer-1:0",
    });
    expect(first).not.toEqual(second);
  });

  it("cannot be recomputed from the public seed without the salt", () => {
    for (let index = 0; index < 20; index += 1) {
      const seed = `layer-1:${index}`;
      const salted = jitterCoordinate({
        ...kinshasa,
        radiusMeters: 500,
        salt: MAP_SALT,
        seed,
      });
      const unsalted = jitterCoordinate({
        ...kinshasa,
        radiusMeters: 500,
        salt: "",
        seed,
      });
      expect(salted).not.toEqual(unsalted);
      expect(salted).not.toEqual(_jitterWithPublicSeedOnly(seed, 500));
    }
  });
});
