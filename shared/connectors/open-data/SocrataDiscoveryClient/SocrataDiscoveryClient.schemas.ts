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
  resource: z
    .object({
      id: z.string(),
      name: z.string(),
      createdAt: SocrataTimestampSchema,
      updatedAt: SocrataTimestampSchema,
      // Three parallel lists, one entry per column. A result that lists no
      // columns has none of them.
      columns_name: z.array(z.string()).default([]),
      columns_field_name: z.array(z.string()).default([]),
      columns_datatype: z.array(z.string()).default([]),
    })
    .refine(
      (resource) => {
        return (
          resource.columns_name.length === resource.columns_field_name.length &&
          resource.columns_datatype.length ===
            resource.columns_field_name.length
        );
      },
      {
        message:
          "columns_name, columns_field_name, and columns_datatype must have one entry per column",
        path: ["columns_field_name"],
      },
    ),
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
