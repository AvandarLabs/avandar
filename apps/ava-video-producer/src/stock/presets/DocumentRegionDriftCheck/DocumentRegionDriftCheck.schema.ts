import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict exact-content comparison and positive page-region extents. */
export const inputSchema = z
  .strictObject({
    saved: z.strictObject({
      page: z.number().int().min(1).max(20),
      box: z.tuple([
        z.number().min(0).max(100),
        z.number().min(0).max(100),
        z.number().min(0).max(100),
        z.number().min(0).max(100),
      ]),
      header: z.string().max(30),
      fingerprint: z.string().min(1).max(16),
    }),
    current: z.strictObject({
      header: z.string().max(30),
      fingerprint: z.string().min(1).max(16),
      detectorOrdinal: z.number().int().min(1).max(9),
    }),
    labels: z.strictObject({
      saved: z.string().min(1).max(30),
      current: z.string().min(1).max(30),
      matched: z.string().min(1).max(30),
      review: z.string().min(1).max(30),
      geometry: z.string().min(1).max(30),
    }),
    showDetectorOrdinal: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(34),
      source: z.string().min(1).max(34),
      result: z.string().min(1).max(34),
    }),
  })
  .superRefine((input, context) => {
    const [left, top, right, bottom] = input.saved.box;
    if (!(left < right && top < bottom)) {
      context.addIssue({
        code: "custom",
        path: ["saved", "box"],
        message:
          "Saved page region requires strictly positive width and height without a minimum extent.",
      });
    }
  }) satisfies z.ZodType;

/** Accepted complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field rules beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "exact-authored-domain",
    paths: ["saved", "current", "labels", "showDetectorOrdinal", "copy"],
    description:
      "Saved box has exactly four numbers [left,top,right,bottom] with 0<=left<right<=100 and 0<=top<bottom<=100. There is no minimum positive extent. Header and fingerprint comparisons use exact unnormalized strings. Both must match to pass. Detector ordinal never changes saved geometry or outcome. Prose meaning, fictional context and suitability are author responsibilities rather than natural-language runtime classification.",
  },
];
