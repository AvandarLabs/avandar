import { jitterCoordinate } from "@/views/GISApp/layers/jitterCoordinate/jitterCoordinate";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { ResolvedGeoBinding } from "$/models/AvaMap/MapLayer/GeoBinding.types";
import type { SensitivityPolicy } from "$/models/AvaMap/MapLayer/SensitivityPolicy.types";

/** Why a source row produced no feature. */
export type DropReason =
  | "nullCoordinate"
  | "nonNumericCoordinate"
  | "outOfRange"
  | "suspectedLatLngSwap"
  | "nullIsland";

/** One reason, how many rows hit it, and a bounded sample of their indexes. */
export type GeometryDropReport = {
  reason: DropReason;
  count: number;
  sampleRowIndexes: readonly number[];
};

/** How many row indexes a single drop report keeps as a sample. */
const MAX_SAMPLE_ROW_INDEXES = 10;

/**
 * Thrown when a layer's sensitivity policy forbids the geometry it was asked
 * to produce.
 */
export class SensitivityViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SensitivityViolationError";
  }
}

function _toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function _classifyCoordinate(
  latitude: number,
  longitude: number,
): DropReason | undefined {
  if (latitude === 0 && longitude === 0) {
    return "nullIsland";
  }
  const isLatitudeInRange = Math.abs(latitude) <= 90;
  const isLongitudeInRange = Math.abs(longitude) <= 180;
  if (isLatitudeInRange && isLongitudeInRange) {
    return undefined;
  }
  // A swap is only worth suggesting when swapping would actually produce a
  // valid pair: the out-of-range latitude must itself fit as a longitude,
  // and the longitude must fit as a latitude. Otherwise this is genuinely
  // bad data, and telling the user "these look swapped" sends them chasing
  // a fix that does not exist.
  if (
    !isLatitudeInRange &&
    Math.abs(latitude) <= 180 &&
    Math.abs(longitude) <= 90
  ) {
    return "suspectedLatLngSwap";
  }
  return "outOfRange";
}

/**
 * Converts one source row into either a GeoJSON feature or the reason it
 * could not become one.
 */
function _placeRow({
  row,
  rowIndex,
  binding,
  sensitivity,
  layerId,
}: {
  row: UnknownRow;
  rowIndex: number;
  binding: ResolvedGeoBinding;
  sensitivity: SensitivityPolicy;
  layerId: string;
}): { feature: GeoJSON.Feature } | { dropReason: DropReason } {
  const { latitudeColumnName, longitudeColumnName } = binding;
  const rawLatitude = row[latitudeColumnName];
  const rawLongitude = row[longitudeColumnName];
  if (rawLatitude == null || rawLongitude == null) {
    return { dropReason: "nullCoordinate" };
  }
  const latitude = _toFiniteNumber(rawLatitude);
  const longitude = _toFiniteNumber(rawLongitude);
  if (latitude === undefined || longitude === undefined) {
    return { dropReason: "nonNumericCoordinate" };
  }
  const invalidReason = _classifyCoordinate(latitude, longitude);
  if (invalidReason) {
    return { dropReason: invalidReason };
  }

  const placed =
    sensitivity.mode === "jitter" ?
      jitterCoordinate({
        longitude,
        latitude,
        radiusMeters: sensitivity.radiusMeters,
        seed: `${layerId}:${rowIndex}`,
      })
    : { longitude, latitude };

  const properties: GeoJSON.GeoJsonProperties = { ...row };
  delete properties[latitudeColumnName];
  delete properties[longitudeColumnName];

  return {
    feature: {
      type: "Feature",
      id: rowIndex,
      geometry: {
        type: "Point",
        coordinates: [placed.longitude, placed.latitude],
      },
      properties,
    },
  };
}

/**
 * Turns accumulated drop-reason row indexes into the reports callers see,
 * capping the sample each report carries.
 */
function _buildDropReports(
  dropsByReason: ReadonlyMap<DropReason, readonly number[]>,
): GeometryDropReport[] {
  return [...dropsByReason.entries()].map(([reason, rowIndexes]) => {
    return {
      reason,
      count: rowIndexes.length,
      sampleRowIndexes: rowIndexes.slice(0, MAX_SAMPLE_ROW_INDEXES),
    };
  });
}

/**
 * Converts query result rows into a GeoJSON `FeatureCollection`, reporting
 * every row it could not convert.
 *
 * Row loss is returned rather than filtered away so callers can tell the user
 * how much data is missing and why.
 *
 * @param params.layerId Used with the row index to seed jitter.
 * @throws SensitivityViolationError when the policy is `aggregateOnly`, which
 * no geometry binding can satisfy yet.
 */
export function toFeatureCollection({
  rows,
  binding,
  sensitivity,
  layerId,
}: {
  rows: readonly UnknownRow[];
  binding: ResolvedGeoBinding;
  sensitivity: SensitivityPolicy;
  layerId: string;
}): {
  featureCollection: GeoJSON.FeatureCollection;
  drops: readonly GeometryDropReport[];
} {
  if (sensitivity.mode === "aggregateOnly") {
    throw new SensitivityViolationError(
      "This layer is aggregate-only, so it cannot be drawn from individual " +
        "coordinates. Bind it to boundaries or bins instead.",
    );
  }

  const features: GeoJSON.Feature[] = [];
  const dropsByReason = new Map<DropReason, number[]>();

  rows.forEach((row, rowIndex) => {
    const placement = _placeRow({
      row,
      rowIndex,
      binding,
      sensitivity,
      layerId,
    });
    if ("dropReason" in placement) {
      const existing = dropsByReason.get(placement.dropReason);
      if (existing) {
        existing.push(rowIndex);
      } else {
        dropsByReason.set(placement.dropReason, [rowIndex]);
      }
      return;
    }
    features.push(placement.feature);
  });

  return {
    featureCollection: { type: "FeatureCollection", features },
    drops: _buildDropReports(dropsByReason),
  };
}
