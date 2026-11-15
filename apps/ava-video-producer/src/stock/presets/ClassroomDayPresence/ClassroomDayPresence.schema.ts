import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/**
 * Complete authored input, with exact collection and accounting constraints.
 */
export const inputSchema = z
  .strictObject({
    learners: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(16),
        }),
      )
      .min(3)
      .max(8),
    days: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(16),
          records: z
            .array(
              z.strictObject({
                learnerId: z.string().min(1).max(20),
                state: z.enum(["present", "absent", "unknown"]),
              }),
            )
            .min(3)
            .max(8),
        }),
      )
      .min(2)
      .max(3),
    labels: z.strictObject({
      present: z.string().min(1).max(18),
      absent: z.string().min(1).max(18),
      unknown: z.string().min(1).max(18),
      roster: z.string().min(1).max(18),
    }),
    deskLayout: z.enum(["two-rows", "horseshoe"]),
    showDayImpressions: z.boolean(),
    caption: z.string().min(1).max(48),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.learners.map(prop("id"))).size !== input.learners.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["learners"],
        message: "Learner IDs must be unique.",
      });
    }
    if (new Set(input.days.map(prop("id"))).size !== input.days.length) {
      context.addIssue({
        code: "custom",
        path: ["days"],
        message: "Day IDs must be unique.",
      });
    }
    input.days.forEach((day, index) => {
      const ids = day.records.map(prop("learnerId"));
      if (
        ids.length !== input.learners.length ||
        new Set(ids).size !== ids.length ||
        !input.learners.every((learner) => ids.includes(learner.id))
      ) {
        context.addIssue({
          code: "custom",
          path: ["days", index, "records"],
          message: "Each day needs exactly one record for every roster member.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Inferred complete scene input. */
export type Input = z.output<typeof inputSchema>;
/** Cross-field rules that structural JSON Schema cannot express. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-roster",
    paths: ["learners.*.id"],
    description: "Learner IDs are unique.",
  },
  {
    id: "unique-days",
    paths: ["days.*.id"],
    description: "Day IDs are unique.",
  },
  {
    id: "complete-days",
    paths: ["days.*.records.*.learnerId", "learners.*.id"],
    description:
      "Every day contains exactly one record for every learner ID, with no unknown references or duplicate records. Present, absent and unknown partition the unchanged roster.",
  },
];
