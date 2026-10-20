import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored review exchange with sequential revision continuity. */
export const inputSchema = z
  .strictObject({
    artifactLabel: z.string().min(1).max(24),
    rounds: z
      .array(
        z.strictObject({
          label: z.string().min(1).max(12),
          draft: z.string().min(1).max(26),
          feedback: z.string().min(1).max(28),
          revised: z.string().min(1).max(26),
        }),
      )
      .min(1)
      .max(2),
    roleLabels: z.strictObject({
      author: z.string().min(1).max(20),
      reviewer: z.string().min(1).max(20),
    }),
    finalLabel: z.string().min(1).max(26),
    showReviewTrail: z.boolean(),
    showRoundLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    input.rounds.forEach((round, index) => {
      if (round.draft === round.revised) {
        context.addIssue({
          code: "custom",
          path: ["rounds", index, "revised"],
          message: "Revision must change the draft.",
        });
      }
      if (index > 0 && round.draft !== input.rounds[index - 1].revised) {
        context.addIssue({
          code: "custom",
          path: ["rounds", index, "draft"],
          message: "Each later draft must equal the prior revision.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Validated input inferred from the schema. */
export type Input = z.output<typeof inputSchema>;
/** Semantic constraints beyond the structural schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "changed-revision",
    paths: ["rounds.*.draft", "rounds.*.revised"],
    description: "Each revision differs from its draft.",
  },
  {
    id: "continuous-revisions",
    paths: ["rounds"],
    description: "Each later draft exactly matches the previous revision.",
  },
];
