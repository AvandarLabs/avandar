import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";

/** Authored condition and outcome for one supported decision branch. */
export const decisionForkBranchSchema: z.ZodObject<
  { id: z.ZodString; condition: z.ZodString; outcome: z.ZodString },
  z.core.$strict
> = z.strictObject({
  id: z.string().max(20),
  condition: z.string().max(24),
  outcome: z.string().max(24),
});

/**
 * Strict one-junction input with unique branches and one authored selection.
 */
export const decisionForkInputSchema = z
  .strictObject({
    prompt: z.string().min(1).max(52),
    branches: z.array(decisionForkBranchSchema).min(2).max(4),
    selectedBranchId: z.string().max(20),
    scenarioLabel: z.string().min(1).max(32),
    selectionLabel: z.string().max(32),
    showUnchosenOutcomes: z.boolean(),
  })
  .superRefine((input, context) => {
    const branchIds = new Set<string>();
    input.branches.forEach((branch, index) => {
      if (branchIds.has(branch.id)) {
        context.addIssue({
          code: "custom",
          path: ["branches", index, "id"],
          message: "Branch IDs must be unique.",
        });
      }
      branchIds.add(branch.id);
    });
    if (!branchIds.has(input.selectedBranchId)) {
      context.addIssue({
        code: "custom",
        path: ["selectedBranchId"],
        message: "The selected branch ID must reference an authored branch.",
      });
    }
  }) satisfies z.ZodType;

/** Schema-inferred authored content for the DecisionFork renderer. */
export type DecisionForkInput = z.output<typeof decisionForkInputSchema>;

/**
 * Structural bounds do not encode branch uniqueness or selection references.
 */
export const decisionForkJsonSchema: StockJsonSchema = z.toJSONSchema(
  decisionForkInputSchema,
);

/** Runtime-only relations accompany the exported structural schema. */
export const DECISION_FORK_SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-branch-ids",
    paths: ["branches.*.id"],
    description: "Every branch ID must be unique within branches.",
  },
  {
    id: "selected-branch-reference",
    paths: ["selectedBranchId", "branches.*.id"],
    description: "selectedBranchId must equal exactly one authored branch ID.",
  },
];

/** Standard packet schema export preserves the existing public schema. */
export const inputSchema: typeof decisionForkInputSchema =
  decisionForkInputSchema;
/** Schema-inferred packet input preserves the existing input alias. */
export type Input = z.output<typeof inputSchema>;
