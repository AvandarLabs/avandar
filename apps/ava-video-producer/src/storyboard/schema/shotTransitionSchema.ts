import { z } from "zod";

/**
 * What the outgoing shot does while a transition covers it: `frozen` holds
 * its last frame, `playing` keeps advancing it past its own end so live
 * footage or typing does not stop under the transition.
 */
const outgoingSchema = z.enum(["frozen", "playing"]);

/**
 * How one shot replaces the previous one, lasting the shot's
 * `transitionInFrames`. Omit it for the default dissolve (or a hard cut when
 * `transitionInFrames` is 0), so plans written before transition kinds
 * existed render unchanged.
 *
 * `cut` is a hard cut declared on purpose, with `transitionInFrames` set to
 * 0. It renders exactly like an undeclared hard cut. The difference is the
 * frame gate: the render passes the shot's first frame to
 * `check-frames.mjs`, which then accepts a luminance jump of any size on that
 * frame, as long as the luminance does not reverse within the next 10 frames.
 * An undeclared hard cut keeps the ordinary per-frame limit.
 *
 * `stepped-column-wipe` covers the outgoing shot with vertical columns of the
 * incoming shot that rise (or drop) one after another, for example to echo a
 * striped brand mark between two acts.
 */
export const shotTransitionSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("cut") }),
  z.strictObject({
    kind: z.literal("dissolve"),
    outgoing: outgoingSchema.optional(),
  }),
  z.strictObject({
    kind: z.literal("stepped-column-wipe"),
    columns: z.number().int().min(2).max(24).optional(),
    staggerFrames: z.number().min(0).max(6).optional(),
    from: z.enum(["bottom", "top"]).optional(),
    order: z.enum(["left-to-right", "right-to-left"]).optional(),
    outgoing: outgoingSchema.optional(),
    outgoingDrift: z
      .strictObject({
        x: z.number().min(-0.5).max(0.5),
        blur: z.number().min(0).max(60).optional(),
      })
      .optional(),
  }),
]);

/** A validated shot transition. */
export type ShotTransition = z.infer<typeof shotTransitionSchema>;
