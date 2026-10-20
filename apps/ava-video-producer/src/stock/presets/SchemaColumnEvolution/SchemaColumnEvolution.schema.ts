import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input structure. */
export const inputSchema = z
  .strictObject({
    earlierRecords: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(16),
          label: z.string().min(1).max(22),
          recordedValue: z.string().min(1).max(18),
        }),
      )
      .min(1)
      .max(3),
    fields: z.strictObject({
      existingLabel: z.string().min(1).max(20),
      addedLabel: z.string().min(1).max(20),
      missingLabel: z.string().min(1).max(20),
    }),
    laterRecord: z.strictObject({
      id: z.string().min(1).max(16),
      label: z.string().min(1).max(22),
      recordedValue: z.string().min(1).max(18),
      addedValue: z.string().min(1).max(18).nullable(),
    }),
    phaseLabels: z.strictObject({
      before: z.string().min(1).max(30),
      expanded: z.string().min(1).max(30),
      later: z.string().min(1).max(30),
    }),
    showVersionLabels: z.boolean(),
    evidenceLabel: z.string().min(1).max(64),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.earlierRecords.map(prop("id"))).size !==
        input.earlierRecords.length ||
      input.earlierRecords.some(propEq("id", input.laterRecord.id))
    ) {
      context.addIssue({
        code: "custom",
        path: ["earlierRecords"],
        message:
          "Earlier IDs are unique and laterRecord.id is absent from earlierRecords.",
      });
    }
  }) satisfies z.ZodType;
/** Accepted output inferred from runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field rules and scene eligibility beyond JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "record-identity",
    paths: ["earlierRecords.*.id", "laterRecord.id"],
    description:
      "Earlier IDs are unique and laterRecord.id is absent from earlierRecords.",
  },
];
