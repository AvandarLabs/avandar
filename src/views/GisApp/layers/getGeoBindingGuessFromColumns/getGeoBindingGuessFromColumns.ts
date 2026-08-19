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

/** Finds the first numeric column whose normalized name is in `names`. */
function _findNumericColumn(
  columns: readonly GeoBindingCandidateColumn[],
  names: ReadonlySet<string>,
): GeoBindingCandidateColumn | undefined {
  return columns.filter(prop("isNumeric")).find(
    propPasses<GeoBindingCandidateColumn, "name", string>(
      "name",
      (name): name is string => {
        return names.has(_normalizeColumnName(name));
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
  );
  const highLongitude = _findNumericColumn(
    columns,
    HIGH_CONFIDENCE_LONGITUDE_NAMES,
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
