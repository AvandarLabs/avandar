import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input without coercion or field defaults. */
export const inputSchema = z
  .strictObject({
    origin: z.strictObject({
      label: z.string().min(1).max(24),
      x: z.number().min(20).max(80),
      y: z.number().min(20).max(80),
    }),
    locations: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(12),
          label: z.string().max(20),
          x: z.number().min(0).max(100),
          y: z.number().min(0).max(100),
        }),
      )
      .min(2)
      .max(6),
    radiusUnits: z.number().gt(0).max(40),
    labels: z.strictObject({
      unit: z.string().min(1).max(44),
      inside: z.string().min(1).max(44),
      outside: z.string().min(1).max(44),
      qualifier: z.string().min(1).max(44),
    }),
    showDistances: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(36),
      source: z.string().min(1).max(36),
      result: z.string().min(1).max(36),
    }),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.locations.map(prop("id"))).size !== input.locations.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["locations"],
        message: "Location IDs must be unique.",
      });
    }
    if (
      [input.origin.x, input.origin.y].some(
        (coordinate) =>
          coordinate - input.radiusUnits < 0 ||
          coordinate + input.radiusUnits > 100,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["radiusUnits"],
        message: "The complete envelope must remain within the map.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "buffer-domain",
    paths: ["locations.*.id", "origin.x", "origin.y", "radiusUnits"],
    description:
      "Location IDs are unique. The entire origin-centered envelope must fit in 0..100 on both axes. Euclidean distance at most radiusUnits includes the boundary once. The denominator is supplied locations only. Positive radii have no minimum.",
  },
];
