import { geoOrthographic, geoPath, geoStream } from "d3-geo";
import { GlobeViewModule } from "../GlobeViewModule";
import LAND from "../naturalEarthLand.json";
import type { GlobeView } from "../GlobeViewModule";
import type { GeoPermissibleObjects } from "d3-geo";

/** Streams geographic geometry through spherical hemisphere clipping. */
function _getGlobePathFromGeometry({
  geometry,
  ...input
}: Readonly<GlobeView & { geometry: GeoPermissibleObjects }>):
  | string
  | undefined {
  const view = GlobeViewModule.fromInput(input);
  geoStream(geometry, {
    point: (longitude, latitude) => {
      if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        Math.abs(latitude) > 90
      ) {
        throw new Error(
          "Geographic coordinates must be finite degrees with valid latitudes.",
        );
      }
    },
    lineStart() {},
    lineEnd() {},
    polygonStart() {},
    polygonEnd() {},
    sphere() {},
  });
  const projection = geoOrthographic()
    .rotate([-view.centerLongitude, -view.centerLatitude, 0])
    .translate([0, 0])
    .scale(view.radius)
    .clipAngle(90)
    .precision(0.25);
  return geoPath(projection).digits(3)(geometry) ?? undefined;
}

/**
 * Locally vendored physical land has no runtime fetch or administrative
 * borders.
 */
function _getGlobeLandPathFromView(
  view: Readonly<GlobeView>,
): string | undefined {
  return _getGlobePathFromGeometry({
    ...view,
    geometry: { type: "MultiPolygon", coordinates: LAND.coordinates },
  });
}

/** Related globe projection operations. */
export const GlobeProjection = {
  /** Streams geographic geometry through spherical hemisphere clipping. */
  getPathFromGeometry: _getGlobePathFromGeometry,
  /**
   * Locally vendored physical land has no runtime fetch or administrative
   * borders.
   */
  getLandPathFromView: _getGlobeLandPathFromView,
} satisfies {
  getPathFromGeometry: typeof _getGlobePathFromGeometry;
  getLandPathFromView: typeof _getGlobeLandPathFromView;
};
