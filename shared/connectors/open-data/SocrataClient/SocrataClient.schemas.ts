import { z } from "zod";

/** A Socrata view's metadata as it arrives on the wire. */
export const SocrataViewMetadataSchema = z.object({
  id: z.string(),
  name: z.string(),
  rowsUpdatedAt: z.number().optional(),
  viewLastModified: z.number().optional(),
});

/** `$select=count(*)` always returns one row shaped `{ count: "123" }`. */
export const SocrataCountResponseSchema = z.array(
  z.object({ count: z.string() }),
);
