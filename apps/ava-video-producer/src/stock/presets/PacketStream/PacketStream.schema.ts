import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";
import { legacyColorSchema } from "../legacy/legacyColorSchema.constants";

/** Strict authored content within the fixed PacketStream layout. */
export const packetStreamInputSchema = z.strictObject({
  lanes: z
    .array(
      z.strictObject({
        label: createLabelSchema({
          maxLength: 12,
          bounds: { fontSize: 16, width: 150, mono: true },
        }),
        color: legacyColorSchema,
        offset: z.number().min(0).max(179),
      }),
    )
    .min(1)
    .max(3),
  packetsPerLane: z.number().int().min(1).max(6),
  heading: createLabelSchema({
    maxLength: 52,
    bounds: { fontSize: 29, width: 832 },
  }),
  showReceipts: z.boolean(),
}) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type PacketStreamInput = z.output<typeof packetStreamInputSchema>;
