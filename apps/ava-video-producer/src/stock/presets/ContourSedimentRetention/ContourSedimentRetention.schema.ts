import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input with cross-field validation. */
export const inputSchema = z
  .strictObject({
    sediment: z.strictObject({
      mobilizedKg: z.number().gt(0).max(1000),
      retainedKg: z.number().min(0).max(1000),
    }),
    intervention: z.strictObject({
      kind: z.enum(["vegetated-strip", "stone-bund"]),
      label: z.string().min(1).max(30),
    }),
    boundary: z.strictObject({
      slopeLabel: z.string().min(1).max(42),
      periodLabel: z.string().min(1).max(42),
    }),
    decision: z.strictObject({
      actorLabel: z.string().min(1).max(32),
      actionLabel: z.string().min(1).max(32),
    }),
    showExportTray: z.boolean(),
    copy: z.strictObject({
      mobilized: z.string().min(0).max(30),
      retained: z.string().min(0).max(30),
      exported: z.string().min(0).max(30),
      boundary: z.string().min(0).max(30),
      unit: z.string().min(0).max(8),
      disclaimer: z.string().min(0).max(52),
    }),
  })
  .superRefine((input, context) => {
    if (input.sediment.retainedKg > input.sediment.mobilizedKg) {
      context.addIssue({
        code: "custom",
        path: ["sediment"],
        message: "Retained mass cannot exceed mobilized mass.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Complete runtime-only and editorial constraints for consumers. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "contour-sediment-retention.0",
    paths: ["sediment.mobilizedKg", "sediment.retainedKg"],
    description:
      "Retained mass must be <= mobilized mass; export = mobilized - retained. Both zero export and zero retained are accepted. Intervention kind and export tray visibility cannot change these quantities.",
  },
  {
    id: "contour-sediment-retention.1",
    paths: ["copy.unit", "boundary"],
    description:
      "The author retains kilogram meaning and a schematic slope/event boundary; animation duration is not event duration.",
  },
];
