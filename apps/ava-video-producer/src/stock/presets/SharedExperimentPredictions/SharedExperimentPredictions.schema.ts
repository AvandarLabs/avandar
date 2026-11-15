import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input with strict structural bounds. */
export const inputSchema = z
  .strictObject({
    learners: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(16),
          predictionDistance: z.number().min(0).max(100),
        }),
      )
      .min(2)
      .max(4),
    observationDistance: z.number().min(0).max(100),
    track: z.strictObject({
      maximum: z.number().int().min(10).max(100),
      unit: z.string().min(1).max(14),
    }),
    labels: z.strictObject({
      experiment: z.string().min(1).max(32),
      prediction: z.string().min(1).max(24),
      observation: z.string().min(1).max(24),
      origin: z.string().min(1).max(24),
    }),
    showDistanceDifferences: z.boolean(),
    showPredictionValues: z.boolean(),
    caption: z.string().min(1).max(56),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.learners.map(prop("id"))).size !== input.learners.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["learners"],
        message: "Learner IDs must be unique.",
      });
    }
    if (
      input.observationDistance > input.track.maximum ||
      input.learners.some(
        ({ predictionDistance }) => predictionDistance > input.track.maximum,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["track"],
        message:
          "Every prediction and observation must lie between zero and track.maximum.",
      });
    }
  }) satisfies z.ZodType;
/** Authored input inferred from the runtime schema. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime cross-field rules in the complete export. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "1",
    paths: ["learners.*.id"],
    description:
      "Learner IDs are unique. Coincident predictions remain separate records.",
  },
  {
    id: "2",
    paths: [
      "learners.*.predictionDistance",
      "observationDistance",
      "track.maximum",
    ],
    description:
      "Every prediction and observation is finite and within 0..track.maximum, endpoints included.",
  },
];
