import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";

/** Strict authored content within the fixed TerminalType layout. */
export const terminalTypeInputSchema = z.strictObject({
  command: createLabelSchema({
    maxLength: 54,
    bounds: { fontSize: 22, width: 730, mono: true },
  }),
  steps: z
    .array(
      z.strictObject({
        text: createLabelSchema({
          maxLength: 46,
          bounds: { fontSize: 21, width: 621, mono: true },
        }),
        detail: createLabelSchema({
          maxLength: 4,
          bounds: { fontSize: 16, width: 45, mono: true },
        }),
      }),
    )
    .min(1)
    .max(3),
  response: createLabelSchema({
    maxLength: 60,
    bounds: { fontSize: 20, width: 732, mono: true },
  }),
  title: createLabelSchema({
    maxLength: 40,
    bounds: { fontSize: 14, width: 700, mono: true },
  }),
  showCaret: z.boolean(),
}) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type TerminalTypeInput = z.output<typeof terminalTypeInputSchema>;
