import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict wide measurement table with exact keyed source cells. */
export const inputSchema = z
  .strictObject({
    measures: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          label: z.string().min(1).max(18),
          unit: z.string().min(1).max(12),
        }),
      )
      .min(2)
      .max(2),
    subjects: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          label: z.string().min(1).max(18),
          values: z
            .array(
              z.strictObject({
                measureId: z.string().max(12),
                value: z.number().min(-10000).max(10000).nullable(),
              }),
            )
            .min(2)
            .max(2),
        }),
      )
      .min(2)
      .max(2),
    missingPolicy: z.enum(["retain-missing-row", "omit-with-ledger"]),
    showSourceGuides: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(34),
      source: z.string().min(1).max(34),
      result: z.string().min(1).max(34),
    }),
  })
  .superRefine((input, context) => {
    const ids = new Set(input.measures.map(prop("id")));
    if (
      ids.size !== input.measures.length ||
      new Set(input.subjects.map(prop("id"))).size !== input.subjects.length ||
      input.subjects.some(
        ({ values }) =>
          values.length !== ids.size ||
          new Set(values.map(({ measureId }) => measureId)).size !== ids.size ||
          values.some(({ measureId }) => !ids.has(measureId)),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["subjects"],
        message:
          "Unique measure/subject IDs and exactly one value per existing measure in each subject are required.",
      });
    }
  }) satisfies z.ZodType;

/** Accepted complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field rules beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "exact-authored-domain",
    paths: [
      "measures",
      "subjects",
      "missingPolicy",
      "showSourceGuides",
      "copy",
    ],
    description:
      "Measure IDs and subject IDs are unique exact strings of maximum length 12 with no minimum. Each of exactly two subjects has exactly one value for each of exactly two existing measure IDs, independent of value-array order. Measurement pairs are unique. Measurement-cell count 4 = output rows + omitted null cells. Null never converts to zero. Units travel with the referenced measure. Prose meaning, fictional context and suitability are author responsibilities rather than natural-language runtime classification.",
  },
];
