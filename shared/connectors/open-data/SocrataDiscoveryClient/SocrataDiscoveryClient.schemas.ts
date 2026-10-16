import { z } from "zod";

/** A page of Socrata Discovery API results as it arrives on the wire. */
export const SocrataDiscoveryResponseSchema = z.object({
  results: z.array(
    z.object({
      resource: z.object({ id: z.string(), name: z.string() }),
      metadata: z.object({ domain: z.string() }),
    }),
  ),
});
