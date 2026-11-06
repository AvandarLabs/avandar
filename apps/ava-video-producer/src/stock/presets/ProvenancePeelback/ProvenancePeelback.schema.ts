import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input. No partial-input defaults or inferred values. */
export const inputSchema = z
  .strictObject({
    summary: z.strictObject({
      label: z.string().min(1).max(32),
      text: z.string().min(1).max(82),
    }),
    sources: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(18),
          title: z.string().min(0).max(30),
          locator: z.string().min(0).max(24),
          excerpt: z.string().min(0).max(78),
        }),
      )
      .min(2)
      .max(3),
    selectedSourceId: z.string().min(0).max(18),
    citationLabel: z.string().min(1).max(24),
    showLocators: z.boolean(),
    sourceArrangement: z.enum(["fan", "parallel-sheets"]),
  })
  .superRefine((input, context) => {
    if (new Set(input.sources.map(prop("id"))).size !== input.sources.length) {
      context.addIssue({
        code: "custom",
        path: ["sources"],
        message: "Collection IDs must be unique.",
      });
    }
    if (!input.sources.some(propEq("id", input.selectedSourceId))) {
      context.addIssue({
        code: "custom",
        path: ["selectedSourceId"],
        message: "The selected source must exist.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred renderer input. */
export type Input = z.output<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "sources-unique-ids",
    paths: ["sources.*.id"],
    description: "Collection IDs must be unique.",
  },
  {
    id: "existing-citation",
    paths: ["selectedSourceId", "sources.*.id"],
    description:
      "The selected source exists. Its excerpt and locator are retained exactly, without invented attribution.",
  },
];
