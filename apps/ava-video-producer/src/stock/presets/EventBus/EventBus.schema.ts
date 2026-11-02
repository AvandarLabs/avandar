import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";

/** Strict authored content within the fixed EventBus layout. */
export const eventBusInputSchema = z.strictObject({
  producers: z
    .array(
      createLabelSchema({ maxLength: 9, bounds: { fontSize: 21, width: 100 } }),
    )
    .min(1)
    .max(3),
  subscribers: z
    .array(
      createLabelSchema({ maxLength: 9, bounds: { fontSize: 21, width: 100 } }),
    )
    .min(1)
    .max(3),
  heading: createLabelSchema({
    maxLength: 30,
    bounds: { fontSize: 14, width: 650 },
  }),
  showPackets: z.boolean(),
}) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type EventBusInput = z.output<typeof eventBusInputSchema>;
