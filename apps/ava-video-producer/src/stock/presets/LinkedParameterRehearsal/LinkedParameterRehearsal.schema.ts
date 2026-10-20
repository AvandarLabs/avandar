import { prop, propEq, propNotEq } from "@avandar/utils";
import { z } from "zod";
import { evaluateAffineRule } from "./evaluateAffineRule";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
const outputSchema = z.strictObject({
  id: z.string().min(1).max(20),
  label: z.string().min(1).max(28),
  multiplier: z.number(),
  offset: z.number(),
  min: z.number(),
  max: z.number(),
  unit: z.string().min(1).max(16),
}) satisfies z.ZodType;
/** Finite direct affine dependencies with at least one independent constant. */
export const inputSchema = z
  .strictObject({
    source: z.strictObject({
      label: z.string().min(1).max(28),
      baseline: z.number(),
      trial: z.number(),
      min: z.number(),
      max: z.number(),
      unit: z.string().min(1).max(16),
    }),
    outputs: z.array(outputSchema).min(2).max(4),
    phaseLabels: z.strictObject({
      baseline: z.string().min(1).max(36),
      trial: z.string().min(1).max(36),
      restored: z.string().min(1).max(36),
    }),
    showRules: z.boolean(),
    showBaselineMarkers: z.boolean(),
    contextLabel: z.string().min(1).max(72),
  })
  .superRefine((input, context) => {
    const { source, outputs } = input;
    if (
      !(source.min < source.max) ||
      source.baseline === source.trial ||
      [source.baseline, source.trial].some(
        (value) => value < source.min || value > source.max,
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["source"],
        message:
          "Distinct baseline and trial must lie inside increasing source bounds.",
      });
    }
    if (
      new Set(outputs.map(prop("id"))).size !== outputs.length ||
      !outputs.some(propEq("multiplier", 0)) ||
      !outputs.some(propNotEq("multiplier", 0))
    ) {
      context.addIssue({
        code: "custom",
        path: ["outputs"],
        message:
          "Unique outputs require a coupled rule and an independent zero-multiplier rule.",
      });
    }
    outputs.forEach((output, index) => {
      const values = [source.baseline, source.trial].map((value) =>
        evaluateAffineRule({
          source: value,
          multiplier: output.multiplier,
          offset: output.offset,
        }),
      );
      if (
        !(output.min < output.max) ||
        values.some(
          (value) =>
            !Number.isFinite(value) || value < output.min || value > output.max,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["outputs", index],
          message:
            "Finite computed endpoints must lie inside increasing output bounds.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Complete input inferred from strict schema output. */
export type Input = z.output<typeof inputSchema>;
/** Affine relationships and collection invariants beyond JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "bounded-distinct-source",
    paths: ["source"],
    description:
      "Increasing source bounds contain distinct baseline and trial values.",
  },
  {
    id: "unique-nonempty-identities",
    paths: ["outputs.*.id"],
    description: "Output IDs are nonempty and unique.",
  },
  {
    id: "bounded-affine-endpoints",
    paths: ["outputs", "source"],
    description:
      "Each increasing output range contains finite multiplier*baseline+offset and multiplier*trial+offset.",
  },
  {
    id: "coupled-and-independent",
    paths: ["outputs.*.multiplier"],
    description:
      "At least one multiplier is nonzero and at least one is exactly zero.",
  },
];
