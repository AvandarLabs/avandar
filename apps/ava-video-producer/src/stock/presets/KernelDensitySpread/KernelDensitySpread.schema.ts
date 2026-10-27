import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input without coercion or field defaults. */
export const inputSchema = z
  .strictObject({
    points: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(12),
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
          weight: z.number().gt(0).max(5),
        }),
      )
      .min(2)
      .max(5),
    radii: z.strictObject({
      initial: z.number().min(5).max(40),
      final: z.number().min(5).max(40),
    }),
    gridSize: z.number().int().min(6).max(12),
    legendMaximum: z.number().max(25),
    labels: z.strictObject({
      radius: z.string().min(1).max(28),
      intensity: z.string().min(1).max(28),
      unit: z.string().min(1).max(28),
      points: z.string().min(1).max(28),
    }),
    showKernels: z.boolean(),
  })
  .superRefine((input, context) => {
    if (new Set(input.points.map(prop("id"))).size !== input.points.length) {
      context.addIssue({
        code: "custom",
        path: ["points"],
        message: "Point IDs must be unique.",
      });
    }
    if (input.radii.initial === input.radii.final) {
      context.addIssue({
        code: "custom",
        path: ["radii"],
        message: "Radii must be distinct.",
      });
    }
    if (
      input.legendMaximum <
      input.points.reduce((total, point) => total + point.weight, 0)
    ) {
      context.addIssue({
        code: "custom",
        path: ["legendMaximum"],
        message: "Legend ceiling must cover the sum of supplied weights.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "kernel-domain",
    paths: ["points.*.id", "points.*.weight", "radii", "legendMaximum"],
    description:
      "Point IDs are unique. Initial and final radii are distinct. LegendMaximum is at least the exact sum of supplied weights, at most 25 and stays fixed. At exact cell centers the intensity is sum(weight * max(0, 1 - distance/radius)), without normalization. Zero modeled intensity does not establish zero population.",
  },
];
