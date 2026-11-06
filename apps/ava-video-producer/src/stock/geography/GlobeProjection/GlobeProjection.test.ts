/**
 * Spherical clipping preserves crossing polygons, holes and visible route arcs.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { geoContains } from "d3-geo";
import LAND from "../naturalEarthLand.json";
import { GlobeProjection } from "./GlobeProjection";

const VIEW: {
  centerLongitude: number;
  centerLatitude: number;
  radius: number;
} = { centerLongitude: 0, centerLatitude: 0, radius: 100 };
const _coordinates = (path: string): number[][] =>
  [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((match) => [
    Number(match[1]),
    Number(match[2]),
  ]);
const _bounded = (path: string): void => {
  assert.doesNotMatch(path, /NaN|Infinity/);
  _coordinates(path).forEach(([x, y]) =>
    assert.ok(Math.hypot(x, y) <= 100.002, `${x},${y}`),
  );
};

test("a limb-crossing polygon is clipped while a fully rear polygon disappears", () => {
  const crossing = GlobeProjection.getPathFromGeometry({
    ...VIEW,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [60, -20],
          [60, 20],
          [120, 20],
          [120, -20],
          [60, -20],
        ],
      ],
    },
  });
  assert.ok(crossing?.length);
  _bounded(crossing);
  assert.equal(
    GlobeProjection.getPathFromGeometry({
      ...VIEW,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [140, -20],
            [140, 20],
            [170, 20],
            [170, -20],
            [140, -20],
          ],
        ],
      },
    }),
    undefined,
  );
});
test("holes remain separate rings and crossing geographic routes terminate at the limb", () => {
  const hole = GlobeProjection.getPathFromGeometry({
    ...VIEW,
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [-30, -30],
          [-30, 30],
          [30, 30],
          [30, -30],
          [-30, -30],
        ],
        [
          [-10, -10],
          [10, -10],
          [10, 10],
          [-10, 10],
          [-10, -10],
        ],
      ],
    },
  });
  assert.ok(hole);
  assert.equal((hole.match(/M/g) ?? []).length, 2);
  _bounded(hole);
  const route = GlobeProjection.getPathFromGeometry({
    ...VIEW,
    geometry: {
      type: "LineString",
      coordinates: [
        [0, 0],
        [120, 0],
      ],
    },
  });
  assert.ok(route);
  _bounded(route);
  assert.deepEqual(_coordinates(route).at(-1), [100, 0]);
  assert.equal(
    GlobeProjection.getPathFromGeometry({
      ...VIEW,
      geometry: {
        type: "LineString",
        coordinates: [
          [130, 0],
          [170, 0],
        ],
      },
    }),
    undefined,
  );
});
test("local land preserves topology, checksum and recognizable containment", () => {
  const bytes = readFileSync(
    new URL("../naturalEarthLand.json", import.meta.url),
  );
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "8310fde5323f4710c02b81ff7ca1e34ed2ae50fc71b821b76dd8900ff72af3e8",
  );
  assert.equal(LAND.coordinates.length, 127);
  assert.equal(LAND.coordinates.flat().length, 128);
  assert.equal(LAND.coordinates.flat(2).length, 5143);
  const geometry = { ...LAND, type: "MultiPolygon" as const };
  [
    [-100, 40],
    [20, 0],
    [100, 40],
    [135, -25],
    [-60, -15],
    [179, 66],
  ].forEach((point) =>
    assert.equal(
      geoContains(geometry, [point[0], point[1]]),
      true,
      point.join(","),
    ),
  );
  [
    [-30, 0],
    [-140, 0],
  ].forEach((point) =>
    assert.equal(
      geoContains(geometry, [point[0], point[1]]),
      false,
      point.join(","),
    ),
  );
});
test("land remains finite and bounded at antimeridian, tilted and polar views after reverse seeks", () => {
  const centers = [
    [0, 0],
    [180, 0],
    [30, 45],
    [0, 90],
    [0, -90],
  ];
  const paths = centers.map(([centerLongitude, centerLatitude]) =>
    GlobeProjection.getLandPathFromView({
      ...VIEW,
      centerLongitude,
      centerLatitude,
    }),
  );
  paths.forEach((path) => {
    assert.ok(path);
    _bounded(path);
  });
  [...centers].reverse().forEach(([centerLongitude, centerLatitude], index) =>
    assert.equal(
      GlobeProjection.getLandPathFromView({
        ...VIEW,
        centerLongitude,
        centerLatitude,
      }),
      paths[paths.length - index - 1],
    ),
  );
  assert.equal(
    GlobeProjection.getLandPathFromView({ ...VIEW, centerLongitude: 360 }),
    paths[0],
  );
});
test("invalid geographic geometry fails before projection", () => {
  assert.throws(() =>
    GlobeProjection.getPathFromGeometry({
      ...VIEW,
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [Infinity, 10],
        ],
      },
    }),
  );
  assert.throws(() =>
    GlobeProjection.getPathFromGeometry({
      ...VIEW,
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [10, 100],
        ],
      },
    }),
  );
});
