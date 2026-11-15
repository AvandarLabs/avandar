import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input. No partial-input defaults or inferred values. */
export const inputSchema = z
  .strictObject({
    reportTitle: z.string().min(1).max(44),
    sections: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(20),
          heading: z.string().min(0).max(30),
          body: z.string().min(0).max(90),
        }),
      )
      .min(2)
      .max(3),
    byline: z.string().min(0).max(32),
    destinationLabel: z.string().min(1).max(32),
    formatLabel: z.string().min(1).max(10),
    finalView: z.enum(["stack", "spread"]),
    showPageNumbers: z.boolean(),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.sections.map(prop("id"))).size !== input.sections.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["sections"],
        message: "Collection IDs must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred renderer input. */
export type Input = z.output<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "sections-unique-ids",
    paths: ["sections.*.id"],
    description: "Collection IDs must be unique.",
  },
];
