import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";

/** Strict authored content within the fixed SchemaMapping layout. */
export const schemaMappingInputSchema = z.strictObject({
  mappings: z
    .array(
      z.strictObject({
        source: createLabelSchema({
          maxLength: 18,
          bounds: { fontSize: 17, width: 240, mono: true },
        }),
        target: createLabelSchema({
          maxLength: 14,
          bounds: { fontSize: 17, width: 152, mono: true },
        }),
        type: createLabelSchema({
          maxLength: 8,
          bounds: { fontSize: 12, width: 60, mono: true },
        }),
      }),
    )
    .min(1)
    .max(4),
  sourceLabel: createLabelSchema({
    maxLength: 24,
    bounds: { fontSize: 23, width: 246 },
  }),
  targetLabel: createLabelSchema({
    maxLength: 24,
    bounds: { fontSize: 23, width: 246 },
  }),
  showChecks: z.boolean(),
}) satisfies z.ZodType;

/** Schema-inferred content supplied to the renderer. */
export type SchemaMappingInput = z.output<typeof schemaMappingInputSchema>;
