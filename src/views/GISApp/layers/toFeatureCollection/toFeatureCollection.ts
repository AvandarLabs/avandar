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

function toFiniteNumber(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function classifyCoordinate(
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
  // A latitude that would be a valid longitude, paired with a longitude that
  // would be a valid latitude, is almost always a swapped pair rather than
  // genuinely bad data.
  if (!isLatitudeInRange && isLongitudeInRange && Math.abs(longitude) <= 90) {
    return "suspectedLatLngSwap";
  }
  return "outOfRange";
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

  const { latitudeColumnName, longitudeColumnName } = binding;
  const features: GeoJSON.Feature[] = [];
  const dropsByReason = new Map<DropReason, number[]>();

  const recordDrop = (reason: DropReason, rowIndex: number): void => {
    const existing = dropsByReason.get(reason);
    if (existing) {
      existing.push(rowIndex);
      return;
    }
    dropsByReason.set(reason, [rowIndex]);
  };

  rows.forEach((row, rowIndex) => {
    const rawLatitude = row[latitudeColumnName];
    const rawLongitude = row[longitudeColumnName];
    if (rawLatitude == null || rawLongitude == null) {
      recordDrop("nullCoordinate", rowIndex);
      return;
    }
    const latitude = toFiniteNumber(rawLatitude);
    const longitude = toFiniteNumber(rawLongitude);
    if (latitude === undefined || longitude === undefined) {
      recordDrop("nonNumericCoordinate", rowIndex);
      return;
    }
    const invalidReason = classifyCoordinate(latitude, longitude);
    if (invalidReason) {
      recordDrop(invalidReason, rowIndex);
      return;
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

    features.push({
      type: "Feature",
      id: rowIndex,
      geometry: {
        type: "Point",
        coordinates: [placed.longitude, placed.latitude],
      },
      properties,
    });
  });

  const drops = [...dropsByReason.entries()].map(([reason, rowIndexes]) => {
    return {
      reason,
      count: rowIndexes.length,
      sampleRowIndexes: rowIndexes.slice(0, MAX_SAMPLE_ROW_INDEXES),
    };
  });

  return {
    featureCollection: { type: "FeatureCollection", features },
    drops,
  };
}
