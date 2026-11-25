import { prop } from "@avandar/utils";
import { quoteSqlLiteral } from "@avandar/utils/sql";
import {
  PLACES_COLUMNS,
  PLACES_MAX_ROWS,
} from "@/clients/places/places.constants";
import type { PlaceRow } from "@/clients/places/places.types";

function _textLiteral(value: string | undefined): string {
  return value === undefined ? "CAST(NULL AS VARCHAR)" : quoteSqlLiteral(value);
}

function _doubleLiteral(value: number): string {
  if (!Number.isFinite(value)) {
    throw new Error("A place coordinate must be a finite number.");
  }
  return `CAST(${value.toString()} AS DOUBLE)`;
}

function _timestampLiteral(value: string | undefined): string {
  return value === undefined
    ? "CAST(NULL AS TIMESTAMP)"
    : `CAST(${quoteSqlLiteral(value)} AS TIMESTAMP)`;
}

function _rowToValuesTuple(row: PlaceRow): string {
  const values = [
    _textLiteral(row.placeId),
    _textLiteral(row.name),
    _textLiteral(row.address),
    _doubleLiteral(row.latitude),
    _doubleLiteral(row.longitude),
    _timestampLiteral(row.startsAt),
    _timestampLiteral(row.endsAt),
    _textLiteral(row.notes),
  ];
  return `(${values.join(", ")})`;
}

function _buildEmptyPlacesSql(): string {
  const columns = PLACES_COLUMNS.map((column) => {
    return `CAST(NULL AS ${column.duckDbType}) AS ${column.name}`;
  });
  return `SELECT ${columns.join(", ")} WHERE false`;
}

/**
 * Writes a places dataset's rows as the `VALUES` query stored in its
 * `raw_sql`. Text goes through `quoteSqlLiteral`, so a value can never end
 * its literal early, and every value is cast so each column keeps its type.
 * Use it whenever a places dataset is created or edited.
 */
export function buildPlacesValuesSql(rows: readonly PlaceRow[]): string {
  if (rows.length > PLACES_MAX_ROWS) {
    throw new Error(
      `A places dataset holds at most ${PLACES_MAX_ROWS} places.`,
    );
  }
  if (rows.length === 0) {
    return _buildEmptyPlacesSql();
  }
  const columnNames = PLACES_COLUMNS.map(prop("name")).join(", ");
  const tuples = rows.map(_rowToValuesTuple).join(",\n  ");
  return `SELECT * FROM (VALUES\n  ${tuples}\n) AS places(${columnNames})`;
}
