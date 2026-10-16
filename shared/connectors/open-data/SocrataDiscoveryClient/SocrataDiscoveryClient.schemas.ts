import { z } from "zod";

export const SocrataDiscoveryResponseSchema = z.object({
  results: z.array(
    z.object({
      resource: z.object({ id: z.string(), name: z.string() }),
      metadata: z.object({ domain: z.string() }),
    }),
  ),
});
