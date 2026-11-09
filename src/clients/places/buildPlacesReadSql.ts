import { normalizeSqlForSubquery } from "@avandar/utils/sql";

/**
 * Wraps a places dataset's stored SQL (or any SQL returning the places
 * columns) so its timestamps come back as `YYYY-MM-DDTHH:mm` text, the shape
 * a `datetime-local` input and `PlaceRow` use. Use it to read places for
 * editing, never to display them.
 */
export function buildPlacesReadSql(placesSql: string): string {
  return (
    "SELECT place_id, name, address, latitude, longitude, " +
    "strftime(starts_at, '%Y-%m-%dT%H:%M') AS starts_at, " +
    "strftime(ends_at, '%Y-%m-%dT%H:%M') AS ends_at, notes " +
    `FROM (${normalizeSqlForSubquery(placesSql)}) AS stored_places`
  );
}
