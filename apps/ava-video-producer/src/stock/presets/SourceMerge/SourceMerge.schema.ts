import { z } from "zod";
import { contentColorSchema } from "../../theme/getContentColorFromValue/getContentColorFromValue";
import { createLabelSchema } from "../legacy/createLabelSchema";

/** Strict authored content within the fixed SourceMerge layout. */
export const sourceMergeInputSchema: z.ZodObject<
  {
    sources: z.ZodArray<
      z.ZodObject<
        {
          name: z.ZodString;
          kind: z.ZodString;
          color: typeof contentColorSchema;
        },
        z.core.$strict
      >
    >;
    destination: z.ZodObject<
      { label: z.ZodString; detail: z.ZodString },
      z.core.$strict
    >;
    showPackets: z.ZodBoolean;
  },
  z.core.$strict
> = z.strictObject({
  sources: z
    .array(
      z.strictObject({
        name: createLabelSchema({
          maxLength: 12,
          bounds: { fontSize: 21, width: 127 },
        }),
        kind: createLabelSchema({
          maxLength: 3,
          bounds: { fontSize: 13, width: 40, mono: true },
        }),
        color: contentColorSchema,
      }),
    )
    .min(1)
    .max(3),
  destination: z.strictObject({
    label: createLabelSchema({
      maxLength: 20,
      bounds: { fontSize: 25, width: 194 },
    }),
    detail: createLabelSchema({
      maxLength: 24,
      bounds: { fontSize: 16, width: 194 },
    }),
  }),
  showPackets: z.boolean(),
});

/** Schema-inferred content supplied to the renderer. */
export type SourceMergeInput = z.output<typeof sourceMergeInputSchema>;
