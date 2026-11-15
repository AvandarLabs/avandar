import { z } from "zod";
import { motionOptionsSchema } from "../../motion-components/motionSettings";

/** A bounded cutout of a diagram that can leave independently of its camera. */
export const objectFlightSchema = z
  .object({
    at: z.number().int().nonnegative(),
    duration: z.number().int().min(1).max(300),
    dx: z.number().min(-1200).max(1200),
    dy: z.number().min(-800).max(800),
    motion: motionOptionsSchema.optional(),
    rect: z
      .object({
        x: z.number().nonnegative(),
        y: z.number().nonnegative(),
        width: z.number().positive().max(480),
        height: z.number().positive().max(400),
      })
      .strict()
      .refine(
        (box) => box.x + box.width <= 960 && box.y + box.height <= 600,
        "Flying object must fit inside the diagram",
      ),
  })
  .strict();

/** Compatibility export for deterministic object-departure geometry. */
export { getObjectFlight } from "../../motion-components/SvgObjectDeparture";
