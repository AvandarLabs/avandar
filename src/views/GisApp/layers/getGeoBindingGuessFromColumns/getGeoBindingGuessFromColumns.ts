import { prop, propPasses } from "@avandar/utils";

/** A source column with the metadata needed for coordinate matching. */
export type GeoBindingCandidateColumn = {
  name: string;
  isNumeric: boolean;
};

/** How sure the guesser is that these names are latitude and longitude. */
export type GeoBindingGuessConfidence = "high" | "low";

/** The names of a matched latitude and longitude column pair. */
export type GeoBindingGuess = {
  latitudeColumnName: string;
  longitudeColumnName: string;
  confidence: GeoBindingGuessConfidence;
};

/** Whole normalized names that almost always mean latitude. */
const HIGH_CONFIDENCE_LATITUDE_NAMES = new Set([
  "lat",
  "latitude",
  "latdd",
  "latitudedd",
]);

/** Whole normalized names that almost always mean longitude. */
const HIGH_CONFIDENCE_LONGITUDE_NAMES = new Set([
  "lon",
  "lng",
  "long",
  "longitude",
  "londd",
  "longitudedd",
]);

/** Whole normalized names that can mean latitude but often do not. */
const LOW_CONFIDENCE_LATITUDE_NAMES = new Set(["y", "coord_y", "coordy"]);

/** Whole normalized names that can mean longitude but often do not. */
const LOW_CONFIDENCE_LONGITUDE_NAMES = new Set(["x", "coord_x", "coordx"]);

/** Lowercases and strips punctuation only from the start and end of a name. */
function _normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

/**
 * Whether a name is one of `names` carrying at most one qualifier word.
 *
 * Real boundary exports rarely name a column plain `lat`: HDX admin extracts
 * ship `center_lat` and `center_lon`, and other sources ship `centroid_lat` or
 * `lat_dd`. Matching only the whole name left every one of those unrecognized,
 * which is what the dead-end "no column holds coordinates" message reported.
 *
 * The one-qualifier limit is what keeps this from reading a name that merely
 * begins with a coordinate word: `center_lat` is a qualified latitude, while
 * `lat_updated_at` is a timestamp that happens to start the same way. Matching
 * whole words rather than substrings is what keeps `flat` and `platitude` out.
 * It applies only to the high-confidence names, because `x` and `y` are single
 * letters that qualify plenty of columns holding no coordinate at all.
 */
function _hasQualifiedName(name: string, names: ReadonlySet<string>): boolean {
  const parts = _normalizeColumnName(name)
    .split(/[^a-z0-9]+/)
    .filter((part) => {
      return part.length > 0;
    });
  return (
    parts.length === 2 &&
    parts.some((part) => {
      return names.has(part);
    })
  );
}

/** Finds the first numeric column whose normalized name is in `names`. */
function _findNumericColumn(
  columns: readonly GeoBindingCandidateColumn[],
  names: ReadonlySet<string>,
  { allowQualified = false }: { allowQualified?: boolean } = {},
): GeoBindingCandidateColumn | undefined {
  return columns.filter(prop("isNumeric")).find(
    propPasses<GeoBindingCandidateColumn, "name", string>(
      "name",
      (name): name is string => {
        return (
          names.has(_normalizeColumnName(name)) ||
          (allowQualified && _hasQualifiedName(name, names))
        );
      },
    ),
  );
}

function _buildGuess(
  latitudeColumn: GeoBindingCandidateColumn,
  longitudeColumn: GeoBindingCandidateColumn,
  confidence: GeoBindingGuessConfidence,
): GeoBindingGuess {
  return {
    latitudeColumnName: latitudeColumn.name,
    longitudeColumnName: longitudeColumn.name,
    confidence,
  };
}

/** Finds the first numeric latitude and longitude pair in the columns. */
export function getGeoBindingGuessFromColumns(
  columns: readonly GeoBindingCandidateColumn[],
): GeoBindingGuess | undefined {
  const highLatitude = _findNumericColumn(
    columns,
    HIGH_CONFIDENCE_LATITUDE_NAMES,
    { allowQualified: true },
  );
  const highLongitude = _findNumericColumn(
    columns,
    HIGH_CONFIDENCE_LONGITUDE_NAMES,
    { allowQualified: true },
  );
  const latitude =
    highLatitude ?? _findNumericColumn(columns, LOW_CONFIDENCE_LATITUDE_NAMES);
  const longitude =
    highLongitude ??
    _findNumericColumn(columns, LOW_CONFIDENCE_LONGITUDE_NAMES);
  return (
    highLatitude && highLongitude ?
      _buildGuess(highLatitude, highLongitude, "high")
    : latitude && longitude ? _buildGuess(latitude, longitude, "low")
    : undefined
  );
}
