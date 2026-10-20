import { z } from "zod";
import { createLabelSchema } from "../legacy/createLabelSchema";

/** Strict authored content within the fixed DataPipeline layout. */
export const dataPipelineInputSchema: z.ZodObject<
  {
    stages: z.ZodArray<
      z.ZodObject<{ label: z.ZodString; detail: z.ZodString }, z.core.$strict>
    >;
    heading: z.ZodString;
    showProgress: z.ZodBoolean;
  },
  z.core.$strict
> = z.strictObject({
  stages: z
    .array(
      z.strictObject({
        label: createLabelSchema({
          maxLength: 12,
          bounds: { fontSize: 22, width: 152 },
        }),
        detail: createLabelSchema({
          maxLength: 18,
          bounds: { fontSize: 15, width: 152 },
        }),
      }),
    )
    .min(1)
    .max(4),
  heading: createLabelSchema({
    maxLength: 52,
    bounds: { fontSize: 32, width: 832 },
  }),
  showProgress: z.boolean(),
});

/** Schema-inferred content supplied to the renderer. */
export type DataPipelineInput = z.output<typeof dataPipelineInputSchema>;
