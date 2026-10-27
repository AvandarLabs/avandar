import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input structure. */
export const inputSchema = z
  .strictObject({
    records: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(16),
          categoryId: z.string().min(1).max(16),
        }),
      )
      .min(1)
      .max(8),
    categories: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(16),
          label: z.string().min(1).max(18),
        }),
      )
      .min(2)
      .max(3),
    utility: z.strictObject({
      label: z.string().min(1).max(26),
      fieldLabel: z.string().min(1).max(26),
      operationLabel: z.string().min(1).max(26),
    }),
    installation: z.strictObject({
      choice: z.union([z.literal("install"), z.literal("defer")]),
      decisionLabel: z.string().min(1).max(32),
    }),
    copy: z.strictObject({
      workspace: z.string().min(1).max(36),
      records: z.string().min(1).max(36),
      emptySocket: z.string().min(1).max(36),
      installed: z.string().min(1).max(36),
      deferred: z.string().min(1).max(36),
      result: z.string().min(1).max(36),
      example: z.string().min(1).max(36),
    }),
    showRecordIds: z.boolean(),
  })
  .superRefine((input, context) => {
    if (new Set(input.records.map(prop("id"))).size !== input.records.length) {
      context.addIssue({
        code: "custom",
        path: ["records"],
        message: "Record IDs are unique. Each record contributes exactly once.",
      });
    }
    if (
      new Set(input.categories.map(prop("id"))).size !== input.categories.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["categories"],
        message: "Category IDs are unique.",
      });
    }
    if (
      input.records.some(
        (row) => !input.categories.some(propEq("id", row.categoryId)),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["records"],
        message: "Every record references an exact supplied category ID.",
      });
    }
  }) satisfies z.ZodType;
/** Accepted output inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field rules and scene eligibility beyond JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "record-identity",
    paths: ["records.*.id"],
    description: "Record IDs are unique. Each record contributes exactly once.",
  },
  {
    id: "category-identity",
    paths: ["categories.*.id"],
    description: "Category IDs are unique.",
  },
  {
    id: "category-reference",
    paths: ["records.*.categoryId", "categories.*.id"],
    description: "Every record references an exact supplied category ID.",
  },
];
