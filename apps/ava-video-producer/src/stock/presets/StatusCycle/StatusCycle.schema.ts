import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";

/** Strict authored content within the fixed StatusCycle layout. */
export const statusCycleInputSchema: z.ZodObject<
  {
    states: z.ZodArray<
      z.ZodObject<
        { label: z.ZodString; detail: z.ZodString; at: z.ZodNumber },
        z.core.$strict
      >
    >;
    showProgress: z.ZodBoolean;
  },
  z.core.$strict
> = z
  .strictObject({
    states: z
      .array(
        z.strictObject({
          label: createLabelSchema({
            maxLength: 14,
            bounds: { fontSize: 37, width: 398 },
          }),
          detail: createLabelSchema({
            maxLength: 30,
            bounds: { fontSize: 18, width: 398 },
          }),
          at: z.number().int().min(12).max(135),
        }),
      )
      .min(2)
      .max(3),
    showProgress: z.boolean(),
  })
  .refine(
    (input) =>
      input.states.every(
        (state, index) => !index || state.at >= input.states[index - 1].at + 12,
      ),
    {
      path: ["states"],
      message:
        "States must arrive in authored order at least twelve frames apart.",
    },
  );

/** Schema-inferred content supplied to the renderer. */
export type StatusCycleInput = z.output<typeof statusCycleInputSchema>;
