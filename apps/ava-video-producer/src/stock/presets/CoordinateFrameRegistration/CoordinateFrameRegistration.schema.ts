import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input. No field-level defaults or coercion. */
export const inputSchema = z
  .strictObject({
    landmarks: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          label: z.string().max(20),
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
        }),
      )
      .min(2)
      .max(4),
    transform: z.strictObject({
      scaleX: z.number().min(0.25).max(2),
      scaleY: z.number().min(0.25).max(2),
      offsetX: z.number().min(-50).max(50),
      offsetY: z.number().min(-50).max(50),
    }),
    frames: z.strictObject({
      source: z.string().min(1).max(20),
      target: z.string().min(1).max(20),
      sourceUnit: z.string().min(1).max(20),
      targetUnit: z.string().min(1).max(20),
    }),
    showCoordinatePairs: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(40),
      before: z.string().min(1).max(40),
      after: z.string().min(1).max(40),
    }),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.landmarks.map(prop("id"))).size !== input.landmarks.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["landmarks"],
        message: "Landmark IDs must be unique.",
      });
    }
    if (input.frames.source === input.frames.target) {
      context.addIssue({
        code: "custom",
        path: ["frames"],
        message: "Source and target frames must differ.",
      });
    }
    input.landmarks.forEach((point, index) => {
      const x = point.x * input.transform.scaleX + input.transform.offsetX;
      const y = point.y * input.transform.scaleY + input.transform.offsetY;
      if (x < 0 || x > 100 || y < 0 || y > 100) {
        context.addIssue({
          code: "custom",
          path: ["landmarks", index],
          message: "Transformed coordinates must remain within 0..100.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Schema-inferred accepted input. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime semantic rules and derived invariants. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-landmarks",
    paths: ["landmarks.*.id"],
    description: "Landmark IDs must be unique, including at most one empty ID.",
  },
  {
    id: "distinct-frames",
    paths: ["frames.source", "frames.target"],
    description:
      "Source and target frame labels must differ by exact string equality. Labels describing schematic frames and avoiding real EPSG claims are author responsibilities, not natural-language classifiers.",
  },
  {
    id: "transformed-domain",
    paths: ["landmarks", "transform"],
    description:
      "Every derived x = x*scaleX+offsetX and y = y*scaleY+offsetY must remain within inclusive 0..100. Identity remains unchanged. Coefficients and offsets apply uniformly to all source coordinates.",
  },
];
