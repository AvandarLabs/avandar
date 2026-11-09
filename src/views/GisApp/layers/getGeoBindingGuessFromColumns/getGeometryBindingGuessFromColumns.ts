import { isDefined } from "@avandar/utils";
import { classifyGeometryValue } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/classifyGeometryValue";
import type { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import type { ClassifiedGeometryValue } from "@/views/GisApp/layers/getGeoBindingGuessFromColumns/classifyGeometryValue";

/**
 * A column plus a few of its cells, enough to tell geometry from text.
 */
export type GeometryBindingCandidateColumn = {
  name: string;
  sampleValues: readonly unknown[];
};

/**
 * The geometry column, encoding, and family read from sampled cells.
 *
 * `sourceCrs` is set only when every sampled cell names the same projected
 * SRID. WGS 84 leaves it unset.
 */
export type GeometryBindingGuess = {
  columnName: string;
  encoding: MapLayer.GeometryEncoding;
  family: MapLayer.GeometryFamily;
  sourceCrs: number | undefined;
};

/** One bad cell in five still counts. Mostly addresses does not. */
const MIN_CLASSIFIED_SHARE = 0.8;

const HIGH_GEOMETRY_NAMES = new Set([
  "geom",
  "geometry",
  "the_geom",
  "wkt",
  "wkb",
  "shape",
  "geojson",
  "geography",
  "geog",
]);

const MEDIUM_GEOMETRY_NAMES = new Set([
  "location",
  "loc",
  "point",
  "points",
  "coordinates",
  "coords",
]);

type RankedGeometryGuess = GeometryBindingGuess & {
  rank: number;
  classifiedCount: number;
};

function _normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

function _nameParts(name: string): string[] {
  return _normalizeColumnName(name)
    .split(/[^a-z0-9]+/)
    .filter((part) => {
      return part.length > 0;
    });
}

/** Names only break ties. `the_geom` outranks `location`. */
function _nameRank(name: string): number {
  const normalized = _normalizeColumnName(name);
  if (HIGH_GEOMETRY_NAMES.has(normalized)) {
    return 3;
  }
  if (MEDIUM_GEOMETRY_NAMES.has(normalized)) {
    return 2;
  }
  const parts = _nameParts(name);
  const hasKnownName =
    parts.length === 2 &&
    parts.some((part) => {
      return HIGH_GEOMETRY_NAMES.has(part) || MEDIUM_GEOMETRY_NAMES.has(part);
    });
  return hasKnownName ? 1 : 0;
}

function _nonEmptyValues(values: readonly unknown[]): unknown[] {
  return values.filter((value) => {
    return value !== null && value !== undefined && value !== "";
  });
}

function _agreedClassification(
  classified: readonly ClassifiedGeometryValue[],
): ClassifiedGeometryValue | undefined {
  const first = classified[0];
  if (!first) {
    return undefined;
  }
  const agrees = classified.every((item) => {
    return (
      item.encoding === first.encoding &&
      item.family === first.family &&
      item.sourceCrs === first.sourceCrs
    );
  });
  return agrees ? first : undefined;
}

function _guessFromColumn(
  column: GeometryBindingCandidateColumn,
): RankedGeometryGuess | undefined {
  const nonEmpty = _nonEmptyValues(column.sampleValues);
  const classified = nonEmpty
    .map((value) => {
      return classifyGeometryValue(value);
    })
    .filter(isDefined);
  if (
    classified.length === 0 ||
    classified.length / nonEmpty.length < MIN_CLASSIFIED_SHARE
  ) {
    return undefined;
  }
  const agreed = _agreedClassification(classified);
  if (!agreed) {
    return undefined;
  }
  return {
    columnName: column.name,
    encoding: agreed.encoding,
    family: agreed.family,
    sourceCrs: agreed.sourceCrs,
    rank: _nameRank(column.name),
    classifiedCount: classified.length,
  };
}

function _preferRankedGuess(
  current: RankedGeometryGuess | undefined,
  guess: RankedGeometryGuess,
): RankedGeometryGuess {
  if (!current || guess.rank > current.rank) {
    return guess;
  }
  if (guess.rank < current.rank) {
    return current;
  }
  return guess.classifiedCount > current.classifiedCount ? guess : current;
}

/**
 * Picks the column whose sampled values agree on one geometry encoding and
 * family. A name such as `the_geom` or `location` only breaks a tie.
 *
 * Call it once a few source rows are in memory, for example while choosing
 * the default geometry binding for a new map layer.
 */
export function getGeometryBindingGuessFromColumns(
  columns: readonly GeometryBindingCandidateColumn[],
): GeometryBindingGuess | undefined {
  const best = columns
    .map(_guessFromColumn)
    .filter(isDefined)
    .reduce<RankedGeometryGuess | undefined>(_preferRankedGuess, undefined);
  if (!best) {
    return undefined;
  }
  return {
    columnName: best.columnName,
    encoding: best.encoding,
    family: best.family,
    sourceCrs: best.sourceCrs,
  };
}
