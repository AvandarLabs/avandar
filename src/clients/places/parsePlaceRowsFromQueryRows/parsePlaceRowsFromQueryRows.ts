import { z } from "zod";
import type { PlaceRow } from "@/clients/places/places.types";

const OptionalTextSchema = z
  .string()
  .nullable()
  .transform((value) => {
    return value === null || value === "" ? undefined : value;
  });

const PlaceQueryRowSchema = z.object({
  place_id: z.string(),
  name: z.string(),
  address: OptionalTextSchema,
  latitude: z.number(),
  longitude: z.number(),
  starts_at: OptionalTextSchema,
  ends_at: OptionalTextSchema,
  notes: OptionalTextSchema,
});

/**
 * Turns the rows `buildPlacesReadSql` returns into place rows. Throws when a
 * row lacks the places columns, which is how the place tool refuses to edit
 * a dataset whose SQL was replaced by something that is not a places list.
 */
export function parsePlaceRowsFromQueryRows(
  rows: ReadonlyArray<Readonly<Record<string, unknown>>>,
): PlaceRow[] {
  const parsed = z.array(PlaceQueryRowSchema).safeParse(rows);
  if (!parsed.success) {
    throw new Error("This dataset's rows are not places.");
  }
  return parsed.data.map((row) => {
    return {
      placeId: row.place_id,
      name: row.name,
      address: row.address,
      latitude: row.latitude,
      longitude: row.longitude,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      notes: row.notes,
    };
  });
}
