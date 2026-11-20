import { z } from "zod";
import { getObjectFlight } from "../../motion-components/getObjectFlight/getObjectFlight";
import { MotionSettings } from "../../motion-components/MotionSettings/MotionSettings";
/** A bounded cutout of a diagram that can leave independently of its camera. */
export const objectFlightSchema = z.strictObject({
  at: z.number().int().nonnegative(),
  duration: z.number().int().min(1).max(300),
  dx: z.number().min(-1200).max(1200),
  dy: z.number().min(-800).max(800),
  motion: MotionSettings.motionOptionsSchema.optional(),
  rect: z
    .strictObject({
      x: z.number().nonnegative(),
      y: z.number().nonnegative(),
      width: z.number().positive().max(480),
      height: z.number().positive().max(400),
    })
    .refine((box) => {
      return box.x + box.width <= 960 && box.y + box.height <= 600;
    }, "Flying object must fit inside the diagram"),
});
/** Compatibility export for deterministic object-departure geometry. */
export { getObjectFlight } from "../../motion-components/getObjectFlight/getObjectFlight";
