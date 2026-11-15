import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict authored data and exact cross-field invariants. */
export const inputSchema = z
  .strictObject({
    records: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(10),
          label: z.string().min(1).max(20),
          status: z.string().min(1).max(20),
          assignee: z.string().min(1).max(20),
        }),
      )
      .min(2)
      .max(4),
    sourceRows: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(10),
          label: z.string().min(1).max(20),
        }),
      )
      .min(1)
      .max(4),
    labels: z.strictObject({
      derived: z.string().min(1).max(32),
      human: z.string().min(1).max(32),
      unchanged: z.string().min(1).max(32),
      missing: z.string().min(1).max(32),
    }),
    showWriteCount: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(38),
      before: z.string().min(1).max(38),
      after: z.string().min(1).max(38),
    }),
  })
  .superRefine((input, context) => {
    const recordIds = new Set(input.records.map(prop("id"))),
      sourceIds = input.sourceRows.map(prop("id"));
    if (recordIds.size !== input.records.length) {
      context.addIssue({
        code: "custom",
        path: ["records"],
        message: "Record IDs must be unique.",
      });
    }
    if (new Set(sourceIds).size !== sourceIds.length) {
      context.addIssue({
        code: "custom",
        path: ["sourceRows"],
        message: "Source IDs must be unique.",
      });
    }
    input.sourceRows.forEach(({ id }, index) => {
      if (!recordIds.has(id)) {
        context.addIssue({
          code: "custom",
          path: ["sourceRows", index, "id"],
          message: "Source IDs must reference existing records.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Schema-inferred complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Structural constraints for serializable editors. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Runtime-only rules not expressed by structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-records",
    paths: ["records.*.id"],
    description: "The 2..4 existing record IDs are unique.",
  },
  {
    id: "unique-source-rows",
    paths: ["sourceRows.*.id"],
    description: "The 1..4 source IDs are unique.",
  },
  {
    id: "existing-source-id",
    paths: ["sourceRows.*.id", "records.*.id"],
    description:
      "Every source ID references an existing record. Source order does not change record order. All records start missing=false. Writes count changed derived labels and newly missing records, preserving identity/status/assignee.",
  },
];
