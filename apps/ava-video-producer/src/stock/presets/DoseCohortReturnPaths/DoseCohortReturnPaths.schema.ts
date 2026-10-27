import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";

function _unique(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map(prop("id"))).size === items.length;
}
/** Strict complete authored inputs and identity relationships. */
export const inputSchema = z
  .strictObject({
    visits: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(18),
        }),
      )
      .min(2)
      .max(4),
    participants: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          label: z.string().min(0).max(18),
          records: z
            .array(
              z.strictObject({
                visitId: z.string().min(0).max(16),
                state: z.enum(["recorded", "missed", "not-due", "unknown"]),
              }),
            )
            .min(2)
            .max(4),
        }),
      )
      .min(2)
      .max(8),
    sceneLabel: z.string().min(1).max(40),
    emphasis: z.enum(["all-records", "missed-and-returned", "unknown-records"]),
    showFractions: z.boolean(),
    copy: z.strictObject({
      baseline: z.string().min(1).max(42),
      recorded: z.string().min(1).max(42),
      missed: z.string().min(1).max(42),
      notDue: z.string().min(1).max(42),
      unknown: z.string().min(1).max(42),
      retained: z.string().min(1).max(42),
    }),
  })
  .superRefine((input, context) => {
    if (!_unique(input.visits) || !_unique(input.participants)) {
      context.addIssue({
        code: "custom",
        message: "Visit and participant IDs must each be unique.",
      });
    }
    input.participants.forEach((participant, index) => {
      const ids = new Set(participant.records.map(prop("visitId")));
      if (
        ids.size !== input.visits.length ||
        participant.records.length !== input.visits.length ||
        input.visits.some((visit) => !ids.has(visit.id))
      ) {
        context.addIssue({
          code: "custom",
          path: ["participants", index, "records"],
          message: "Each participant requires exactly one record per visit.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Accepted input, inferred without widening the schema output. */
export type Input = z.output<typeof inputSchema>;
/** Cross-field rules requiring runtime validation. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities-and-authored-relations",
    paths: ["visits", "participants"],
    description:
      "Every visit uses the same cohort denominator; recorded, missed, not-yet-due and unknown states remain distinct and changing one visit never creates a new person. 2..4 visits; unique IDs <= 16 characters; labels <= 18 characters; ordinal labels only in default examples. 2..8 participants; IDs <= 16 and labels <= 18 characters; exactly one record for every visit ID; unique IDs and no duplicate visit record.",
  },
];
