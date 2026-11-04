import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input without coercion or field defaults. */
export const inputSchema = z
  .strictObject({
    locations: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          label: z.string().max(20),
          x: z.number().min(10).max(90),
          y: z.number().min(10).max(90),
          offsetX: z.number(),
          offsetY: z.number(),
        }),
      )
      .min(1)
      .max(3),
    radiusUnits: z.number().gt(0).max(20),
    labels: z.strictObject({
      source: z.string().min(1).max(30),
      display: z.string().min(1).max(30),
      approximate: z.string().min(1).max(30),
      bound: z.string().min(1).max(30),
    }),
    showLocalOriginal: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(40),
      before: z.string().min(1).max(40),
      after: z.string().min(1).max(40),
    }),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.locations.map(prop("id"))).size !== input.locations.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["locations"],
        message: "Location IDs must be unique, including empty IDs.",
      });
    }
    input.locations.forEach((location, index) => {
      if (
        Math.hypot(location.offsetX, location.offsetY) > input.radiusUnits ||
        location.x + location.offsetX < 0 ||
        location.x + location.offsetX > 100 ||
        location.y + location.offsetY < 0 ||
        location.y + location.offsetY > 100
      ) {
        context.addIssue({
          code: "custom",
          path: ["locations", index],
          message: "Displacement must be within the radius and display bounds.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "bounded-offset",
    paths: [
      "locations.*.id",
      "locations.*.x",
      "locations.*.y",
      "locations.*.offsetX",
      "locations.*.offsetY",
      "radiusUnits",
    ],
    description:
      "Unique location IDs allow at most one empty ID. Each exact authored offset has Euclidean length at most radiusUnits. Both displaced coordinates must remain in 0..100. Every public marker uses only the displaced coordinates, even with zero offsets. Positive radii have no minimum.",
  },
];
