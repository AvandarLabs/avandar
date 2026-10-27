import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored document with exact collection and reference bounds. */
export const inputSchema = z
  .strictObject({
    records: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(18),
          label: z.string().min(0).max(22),
          groups: z.tuple([
            z.string().min(1).max(18),
            z.string().min(1).max(18),
          ]),
        }),
      )
      .min(4)
      .max(8),
    dimensions: z.tuple([z.string().min(1).max(22), z.string().min(1).max(22)]),
    selectionPath: z.array(z.string().min(0).max(18)).min(1).max(2),
    labels: z.strictObject({
      title: z.string().min(0).max(42),
      root: z.string().min(1).max(28),
      detail: z.string().min(1).max(28),
      context: z.string().min(1).max(28),
    }),
    retainContext: z.boolean(),
    selectionStyle: z.enum(["window", "inset-frame"]),
  })
  .superRefine((input, context) => {
    if (new Set(input.records.map(prop("id"))).size !== input.records.length) {
      context.addIssue({
        code: "custom",
        path: ["records"],
        message: "Record IDs must be unique.",
      });
    }
    [0, 1].forEach((dimension) => {
      if (
        new Set(input.records.map((record) => record.groups[dimension])).size >
        3
      ) {
        context.addIssue({
          code: "custom",
          path: ["records"],
          message: "At most three groups are allowed per dimension.",
        });
      }
    });
    if (
      !input.records.some((record) =>
        input.selectionPath.every(
          (value, index) => record.groups[index] === value,
        ),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["selectionPath"],
        message: "The full exact prefix must match a record.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from the strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Cross-reference constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-records",
    paths: ["records.*.id"],
    description: "Record IDs are unique, including at most one empty ID.",
  },
  {
    id: "dimension-groups",
    paths: ["records.*.groups"],
    description: "Each dimension has one to three exact distinct values.",
  },
  {
    id: "matching-prefix",
    paths: ["selectionPath", "records.*.groups"],
    description:
      "The entire exact selection prefix matches at least one record.",
  },
];
