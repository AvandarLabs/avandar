import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete bounded authored inputs, with no partial defaults. */
export const inputSchema = z.strictObject({
  model: z.strictObject({
    label: z.string().min(1).max(28),
    detail: z.string().min(0).max(28),
  }),
  input: z.strictObject({
    label: z.string().min(1).max(24),
    text: z.string().min(1).max(96),
  }),
  response: z.strictObject({
    label: z.string().min(1).max(32),
    lines: z.array(z.string().min(1).max(44)).min(1).max(3),
  }),
  copy: z.strictObject({
    device: z.string().min(1).max(34),
    boundary: z.string().min(1).max(34),
    example: z.string().min(1).max(34),
  }),
  deviceShape: z.enum(["phone", "tablet", "laptop"]),
  showCutaway: z.boolean(),
  showLabels: z.boolean(),
}) satisfies z.ZodType;
/** Schema-inferred authored content. */
export type Input = z.output<typeof inputSchema>;
/** Runtime relations supplement structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [];
