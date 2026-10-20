import { z } from "zod";

/**
 * An ISO 8601 date-time with a time zone. A value that is missing or not a
 * full date-time fails its result, so a result never reaches a caller with an
 * invalid `Date` behind its timestamp.
 */
const SocrataTimestampSchema = z.iso.datetime({ offset: true });

/**
 * One Socrata Discovery API result as it arrives on the wire. A result that
 * fails this schema is skipped on its own, not the page it arrived in.
 */
export const SocrataDiscoveryResultSchema = z.object({
  resource: z.object({
    id: z.string(),
    name: z.string(),
    createdAt: SocrataTimestampSchema,
    updatedAt: SocrataTimestampSchema,
  }),
  metadata: z.object({ domain: z.string() }),
});

/**
 * A page of Socrata Discovery API results as it arrives on the wire. Only the
 * envelope is validated here: each result is left unparsed so the client can
 * validate it separately and skip a malformed one without failing the page.
 */
export const SocrataDiscoveryResponseSchema = z.object({
  results: z.array(z.unknown()),
  resultSetSize: z.number().int().nonnegative(),
});
