import { z } from "zod";

/**
 * An ISO 8601 date-time with a time zone. A missing or unparseable value
 * fails the whole page, so a result never reaches a caller with an invalid
 * `Date` behind its timestamp.
 */
const SocrataTimestampSchema = z.iso.datetime({ offset: true });

/** A page of Socrata Discovery API results as it arrives on the wire. */
export const SocrataDiscoveryResponseSchema = z.object({
  results: z.array(
    z.object({
      resource: z.object({
        id: z.string(),
        name: z.string(),
        createdAt: SocrataTimestampSchema,
        updatedAt: SocrataTimestampSchema,
      }),
      metadata: z.object({ domain: z.string() }),
    }),
  ),
  resultSetSize: z.number(),
});
