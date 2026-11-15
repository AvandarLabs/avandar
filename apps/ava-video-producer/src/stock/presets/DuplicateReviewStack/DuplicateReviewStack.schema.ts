import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored document with exact collection and reference bounds. */
export const inputSchema = z
  .strictObject({
    title: z.string().min(1).max(44),
    groups: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(24),
          records: z
            .array(
              z.strictObject({
                id: z.string().min(0).max(12),
                label: z.string().min(0).max(26),
                comparisonValue: z.string().min(0).max(22),
              }),
            )
            .min(2)
            .max(3),
          retainedId: z.string().min(0).max(12).nullable(),
        }),
      )
      .min(1)
      .max(2),
    comparisonFieldLabel: z.string().min(1).max(28),
    labels: z.strictObject({
      retained: z.string().min(1).max(28),
      unresolved: z.string().min(1).max(28),
      alternatives: z.string().min(1).max(28),
    }),
    finalView: z.enum(["offset-stack", "comparison-pair"]),
    showRecordIds: z.boolean(),
  })
  .superRefine((input, context) => {
    if (new Set(input.groups.map(prop("id"))).size !== input.groups.length) {
      context.addIssue({
        code: "custom",
        path: ["groups"],
        message: "Group IDs must be unique.",
      });
    }
    const records = input.groups.flatMap(prop("records"));
    if (new Set(records.map(prop("id"))).size !== records.length) {
      context.addIssue({
        code: "custom",
        path: ["groups"],
        message: "Record IDs must be globally unique.",
      });
    }
    input.groups.forEach((group, index) => {
      if (
        group.retainedId !== null &&
        !group.records.some(
          propEq<{ id: unknown }, "id", unknown>("id", group.retainedId),
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["groups", index, "retainedId"],
          message: "Retention must reference a record within its group.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Input inferred from the strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Cross-reference constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities",
    paths: ["groups.*.id", "groups.*.records.*.id"],
    description: "Group IDs are unique and record IDs are globally unique.",
  },
  {
    id: "within-group-choice",
    paths: ["groups.*.retainedId", "groups.*.records.*.id"],
    description:
      "A non-null retained ID must occur inside its own candidate group.",
  },
];
