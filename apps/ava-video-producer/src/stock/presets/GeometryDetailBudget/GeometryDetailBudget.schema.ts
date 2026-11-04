import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input. No field-level defaults or coercion. */
export const inputSchema = z
  .strictObject({
    vertices: z
      .array(z.tuple([z.number().min(5).max(95), z.number().min(5).max(95)]))
      .min(3)
      .max(8),
    tolerance: z.number().min(0).max(30),
    labels: z.strictObject({
      original: z.string().min(1).max(26),
      simplified: z.string().min(1).max(26),
      kept: z.string().min(1).max(26),
      removed: z.string().min(1).max(26),
      unit: z.string().min(1).max(26),
    }),
    showDeviationGuides: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(40),
      before: z.string().min(1).max(40),
      after: z.string().min(1).max(40),
    }),
  })
  .superRefine((input, context) => {
    input.vertices.forEach((point, index) => {
      const previous = input.vertices[index - 1];
      if (previous && point[0] === previous[0] && point[1] === previous[1]) {
        context.addIssue({
          code: "custom",
          path: ["vertices", index],
          message: "Consecutive vertices must differ.",
        });
      }
    });
    const first = input.vertices[0];
    const last = input.vertices.at(-1);
    if (first && last && first[0] === last[0] && first[1] === last[1]) {
      context.addIssue({
        code: "custom",
        path: ["vertices"],
        message: "Open-line endpoints must differ.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred accepted input. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime semantic rules and derived invariants. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "open-line",
    paths: ["vertices"],
    description:
      "Consecutive vertices must be distinct and first and last endpoints must differ. Repeated nonconsecutive interior vertices are accepted.",
  },
  {
    id: "deterministic-splits",
    paths: ["vertices", "tolerance"],
    description:
      "Douglas-Peucker uses distance to finite segments, earliest source index on equal-distance ties, and recursive splits only when maximum distance is strictly greater than tolerance. Endpoints remain retained and every removed vertex is within tolerance of its associated retained segment.",
  },
];
