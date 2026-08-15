import {
  getFiniteNumberFromValue,
  isDefined,
  makeBucketMap,
  omit,
  prop,
} from "@avandar/utils";
import { match } from "ts-pattern";
import { jitterCoordinate } from "@/views/GisApp/layers/jitterCoordinate/jitterCoordinate";
import { SensitivityViolationError } from "@/views/GisApp/layers/SensitivityViolationError";
import type { UnknownRow } from "@/clients/DuckDbClient/DuckDbClient";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";

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

/** One row's outcome: either a feature, or the reason it produced none. */
type RowPlacement = { rowIndex: number } & (
  | { feature: GeoJSON.Feature }
  | { dropReason: DropReason }
);

type PlaceCoordinateInput = {
  latitude: number;
  longitude: number;
  sensitivity: MapLayer.Sensitivity;
  layerId: string;
  rowIndex: number;
};

type CreatePointFeatureInput = {
  binding: MapLayer.GeoBindingColumnNames;
  coordinate: { longitude: number; latitude: number };
  propertyColumnNames: readonly string[] | "all";
  row: UnknownRow;
  rowIndex: number;
};

type PlaceRowInput = {
  row: UnknownRow;
  rowIndex: number;
  binding: MapLayer.GeoBindingColumnNames;
  sensitivity: MapLayer.Sensitivity;
  layerId: string;
  propertyColumnNames: readonly string[] | "all";
};

type MakeFeatureCollectionInput = {
  rows: readonly UnknownRow[];
  binding: MapLayer.GeoBindingColumnNames;
  propertyColumnNames: readonly string[] | "all";
  sensitivity: MapLayer.Sensitivity;
  layerId: string;
};

type FeatureCollectionConversion = {
  featureCollection: GeoJSON.FeatureCollection;
  drops: readonly GeometryDropReport[];
};

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
 * Places one coordinate pair according to the layer's sensitivity policy.
 *
 * Dispatch is exhaustive on purpose: a new policy mode must be handled here
 * rather than silently falling through to exact placement, which would leak
 * the precise location the policy exists to protect.
 */
function _placeCoordinate({
  latitude,
  longitude,
  sensitivity,
  layerId,
  rowIndex,
}: PlaceCoordinateInput): { longitude: number; latitude: number } {
  return match(sensitivity)
    .with({ mode: "exact" }, () => {
      return { longitude, latitude };
    })
    .with({ mode: "jitter" }, (policy) => {
      return jitterCoordinate({
        longitude,
        latitude,
        radiusMeters: policy.radiusMeters,
        seed: `${layerId}:${rowIndex}`,
      });
    })
    .with({ mode: "aggregateOnly" }, () => {
      throw new SensitivityViolationError("aggregateOnly");
    })
    .exhaustive();
}

/** Copies requested keys that are own properties of the source row. */
function _pickOwnProperties(
  row: UnknownRow,
  propertyColumnNames: readonly string[],
): GeoJSON.GeoJsonProperties {
  return Object.fromEntries(
    propertyColumnNames
      .filter((propertyColumnName) => {
        return Object.prototype.hasOwnProperty.call(row, propertyColumnName);
      })
      .map((propertyColumnName) => {
        return [propertyColumnName, row[propertyColumnName]];
      }),
  );
}

/** Builds a point feature carrying exactly the requested properties. */
function _createPointFeature({
  binding,
  coordinate,
  propertyColumnNames,
  row,
  rowIndex,
}: CreatePointFeatureInput): GeoJSON.Feature {
  const properties: GeoJSON.GeoJsonProperties =
    propertyColumnNames === "all" ?
      omit(row, [binding.latitudeColumnName, binding.longitudeColumnName])
    : _pickOwnProperties(row, propertyColumnNames);
  return {
    type: "Feature",
    id: rowIndex,
    geometry: {
      type: "Point",
      coordinates: [coordinate.longitude, coordinate.latitude],
    },
    properties,
  };
}

/** Reads and validates the coordinate columns of one source row. */
function _readCoordinate(
  row: UnknownRow,
  binding: MapLayer.GeoBindingColumnNames,
):
  | { coordinate: { longitude: number; latitude: number } }
  | { dropReason: DropReason } {
  const rawLatitude = row[binding.latitudeColumnName];
  const rawLongitude = row[binding.longitudeColumnName];
  if (rawLatitude == null || rawLongitude == null) {
    return { dropReason: "nullCoordinate" };
  }
  const latitude = getFiniteNumberFromValue(rawLatitude);
  const longitude = getFiniteNumberFromValue(rawLongitude);
  if (latitude === undefined || longitude === undefined) {
    return { dropReason: "nonNumericCoordinate" };
  }
  const invalidReason = _classifyCoordinate(latitude, longitude);
  return invalidReason === undefined ?
      { coordinate: { longitude, latitude } }
    : { dropReason: invalidReason };
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
  propertyColumnNames,
}: PlaceRowInput): RowPlacement {
  const coordinateRead = _readCoordinate(row, binding);
  if ("dropReason" in coordinateRead) {
    return { rowIndex, dropReason: coordinateRead.dropReason };
  }
  const placedCoordinate = _placeCoordinate({
    ...coordinateRead.coordinate,
    sensitivity,
    layerId,
    rowIndex,
  });

  return {
    rowIndex,
    feature: _createPointFeature({
      binding,
      coordinate: placedCoordinate,
      propertyColumnNames,
      row,
      rowIndex,
    }),
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

/** Separates successful placements from drops and builds their report. */
function _buildConversionResult(
  placements: readonly RowPlacement[],
): FeatureCollectionConversion {
  const features = placements
    .map((placement) => {
      return "feature" in placement ? placement.feature : undefined;
    })
    .filter(isDefined);
  const droppedPlacements = placements.filter(
    (placement): placement is { rowIndex: number; dropReason: DropReason } => {
      return "dropReason" in placement;
    },
  );
  return {
    featureCollection: { type: "FeatureCollection", features },
    drops: _buildDropReports(
      makeBucketMap(droppedPlacements, {
        keyFn: prop("dropReason"),
        valueFn: prop("rowIndex"),
      }),
    ),
  };
}

/**
 * Converts query result rows into a GeoJSON `FeatureCollection`, reporting
 * every row it could not convert.
 *
 * Row loss is returned rather than filtered away so callers can tell the user
 * how much data is missing and why.
 *
 * @param params The rows to convert and how to read geometry out of them.
 * @param params.rows Query result rows, one candidate feature each.
 * @param params.binding Which columns carry geometry, named not id'd.
 * @param params.propertyColumnNames Which columns become feature properties,
 * from the layer's popup config. `"all"` keeps everything except the bound
 * coordinate columns.
 * @param params.sensitivity Spatial privacy policy applied to each geometry.
 * @param params.layerId Used with the row index to seed jitter.
 * @returns The converted features and a report for every row that was dropped.
 * @throws SensitivityViolationError when the policy is `aggregateOnly`, which
 * no geometry binding can satisfy yet.
 */
export function makeFeatureCollectionFromRows({
  rows,
  binding,
  propertyColumnNames,
  sensitivity,
  layerId,
}: MakeFeatureCollectionInput): FeatureCollectionConversion {
  if (sensitivity.mode === "aggregateOnly") {
    throw new SensitivityViolationError("aggregateOnly");
  }

  const placements = rows.map((row, rowIndex) => {
    return _placeRow({
      row,
      rowIndex,
      binding,
      propertyColumnNames,
      sensitivity,
      layerId,
    });
  });
  return _buildConversionResult(placements);
}
