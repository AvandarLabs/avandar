import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict complete inputs preserve authored text and structural invariants. */
export const inputSchema = z.strictObject({
  fixtureLabel: z.string().min(1).max(28),
  workerLabel: z.string().min(1).max(24),
  repair: z.strictObject({
    label: z.string().min(1).max(32),
    gesture: z.enum(["tighten", "replace-seal"]),
  }),
  retest: z.enum(["stopped", "still-leaking", "not-tested"]),
  labels: z.strictObject({
    containment: z.string().min(1).max(28),
    repair: z.string().min(1).max(28),
    test: z.string().min(1).max(28),
    stopped: z.string().min(1).max(28),
    continued: z.string().min(1).max(28),
    untested: z.string().min(1).max(28),
    example: z.string().min(1).max(28),
  }),
  showPhaseCaptions: z.boolean(),
}) satisfies z.ZodType;
/** Authored input inferred from its strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Complete structural JSON Schema, without runtime cross-field refinements. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Runtime-only reference, uniqueness and cross-field constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [];
