import { prop, propPasses } from "@avandar/utils";

/** A source column with the metadata needed for coordinate matching. */
export type GeoBindingCandidateColumn = {
  name: string;
  isNumeric: boolean;
};

/** The names of a matched latitude and longitude column pair. */
export type GeoBindingGuess = {
  latitudeColumnName: string;
  longitudeColumnName: string;
};

/** Whole normalized names that mean latitude. */
const LATITUDE_NAMES = new Set(["lat", "latitude", "y", "latdd", "latitudedd"]);

/** Whole normalized names that mean longitude. */
const LONGITUDE_NAMES = new Set([
  "lon",
  "lng",
  "long",
  "longitude",
  "x",
  "londd",
  "longitudedd",
]);

/** Normalizes a column name for whole-name coordinate matching. */
function _normalizeColumnName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Finds the first numeric latitude and longitude pair in the columns. */
export function getGeoBindingGuessFromColumns(
  columns: readonly GeoBindingCandidateColumn[],
): GeoBindingGuess | undefined {
  const numericColumns = columns.filter(prop("isNumeric"));
  const latitudeColumn = numericColumns.find(
    propPasses<GeoBindingCandidateColumn, "name", string>(
      "name",
      (name): name is string => {
        return LATITUDE_NAMES.has(_normalizeColumnName(name));
      },
    ),
  );
  const longitudeColumn = numericColumns.find(
    propPasses<GeoBindingCandidateColumn, "name", string>(
      "name",
      (name): name is string => {
        return LONGITUDE_NAMES.has(_normalizeColumnName(name));
      },
    ),
  );

  return latitudeColumn && longitudeColumn ?
      {
        latitudeColumnName: latitudeColumn.name,
        longitudeColumnName: longitudeColumn.name,
      }
    : undefined;
}
