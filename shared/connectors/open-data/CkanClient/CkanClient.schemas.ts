import { z } from "zod";

/**
 * A CKAN resource as it arrives on the wire. Only the fields this code reads
 * are required. `mimetype` is optional and nullable because it is absent on a
 * large fraction of real resources, and `size` and `last_modified` are the same
 * because an older upload can be missing either.
 */
export const CkanResourceSchema = z.object({
  id: z.string(),
  name: z.string(),
  format: z.string(),
  url: z.string(),
  url_type: z.string().nullish(),
  size: z.number().nullish(),
  hash: z.string().nullish(),
  last_modified: z.string().nullish(),
  mimetype: z.string().nullish(),
  datastore_active: z.boolean().nullish(),
});

/** A CKAN dataset as it arrives on the wire. */
export const CkanPackageSchema = z.object({
  id: z.string(),
  name: z.string(),
  metadata_modified: z.string().nullish(),
  resources: z.array(CkanResourceSchema),
});

/**
 * CKAN's response envelope. It reports failure in-band with `success: false`
 * and an HTTP 200, so `success` is the discriminant and `result` is only
 * readable on the success branch.
 */
export const CkanEnvelopeSchema = z.union([
  z.object({ success: z.literal(true), result: z.unknown() }),
  z.object({
    success: z.literal(false),
    error: z.object({
      __type: z.string().nullish(),
      message: z.string().nullish(),
    }),
  }),
]);
