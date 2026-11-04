import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input with strict structural bounds. */
export const inputSchema = z.strictObject({
  learnerLabel: z.string().min(1).max(20),
  settingLabels: z.strictObject({
    practice: z.string().min(1).max(26),
    application: z.string().min(1).max(26),
  }),
  task: z.strictObject({
    instruction: z.string().min(1).max(28),
    value: z.number().int().min(1).max(10),
    unit: z.string().min(1).max(8),
  }),
  workpieces: z.strictObject({
    practiceLabel: z.string().min(1).max(24),
    applicationLabel: z.string().min(1).max(24),
    material: z.enum(["wood", "fabric", "card"]),
  }),
  showAlignmentGuides: z.boolean(),
  showFirstArtifactAtHold: z.boolean(),
  caption: z.string().min(1).max(56),
}) satisfies z.ZodType;
/** Authored input inferred from the runtime schema. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime cross-field rules in the complete export. */
export const SEMANTIC_RULES: StockSemanticRule[] = [];
