import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict repeated blocks with complete keyed membership. */
export const inputSchema = z
  .strictObject({
    fields: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          label: z.string().min(1).max(18),
        }),
      )
      .min(2)
      .max(3),
    blocks: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          heading: z.string().min(1).max(20),
          cells: z
            .array(
              z.strictObject({
                fieldId: z.string().max(12),
                text: z.string().min(1).max(26).nullable(),
              }),
            )
            .min(2)
            .max(3),
        }),
      )
      .min(2)
      .max(3),
    missingLabel: z.string().min(1).max(20),
    showBlockNumbers: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(34),
      source: z.string().min(1).max(34),
      result: z.string().min(1).max(34),
    }),
  })
  .superRefine((input, context) => {
    const ids = new Set(input.fields.map(prop("id")));
    if (
      ids.size !== input.fields.length ||
      new Set(input.blocks.map(prop("id"))).size !== input.blocks.length ||
      input.blocks.some(
        ({ cells }) =>
          cells.length !== ids.size ||
          new Set(cells.map(({ fieldId }) => fieldId)).size !== ids.size ||
          cells.some(({ fieldId }) => !ids.has(fieldId)),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["blocks"],
        message:
          "Unique field/block IDs and exactly one cell per existing field ID in each block are required.",
      });
    }
  }) satisfies z.ZodType;

/** Accepted complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field rules beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "exact-authored-domain",
    paths: ["fields", "blocks", "missingLabel", "showBlockNumbers", "copy"],
    description:
      "Fields and blocks each have unique exact IDs, including at most one empty ID. Block IDs and field IDs have maximum length 12, no minimum. Every block has exactly one cell for each existing field ID, independent of cell array order. Null means missing and never zero. Output columns follow fields array order, rows follow blocks array order. Duplicate headings remain distinct by ID. Prose meaning, fictional context and suitability are author responsibilities rather than natural-language runtime classification.",
  },
];
