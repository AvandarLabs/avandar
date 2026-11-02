import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input and runtime cross-field constraints. */
export const inputSchema = z
  .strictObject({
    fraction: z.strictObject({
      numerator: z.number().int().min(1).max(8),
      denominator: z.number().int().min(2).max(8),
    }),
    representations: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          learnerLabel: z.string().min(1).max(16),
          materialLabel: z.string().min(1).max(22),
          material: z.enum(["folded-paper", "counters", "shaded-board"]),
        }),
      )
      .min(2)
      .max(3),
    lessonLabel: z.string().min(1).max(36),
    showFractionNotation: z.boolean(),
    resolvedArrangement: z.enum(["separate-desks", "shared-table"]),
    caption: z.string().min(1).max(56),
  })
  .superRefine((input, context) => {
    if (input.fraction.numerator > input.fraction.denominator) {
      context.addIssue({
        code: "custom",
        path: ["fraction", "numerator"],
        message: "Selected parts cannot exceed all equal parts.",
      });
    }
    if (
      new Set(input.representations.map(prop("id"))).size !==
      input.representations.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["representations"],
        message: "Representation IDs must be unique.",
      });
    }
    if (
      new Set(input.representations.map(prop("material"))).size !==
      input.representations.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["representations"],
        message: "Each material appears at most once.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from the strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime and editorial invariants beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "fraction-material-translation.0",
    paths: ["fraction.numerator", "fraction.denominator"],
    description:
      "Integer denominator is 2..8 and integer numerator is 1..denominator. Each representation generates exactly denominator equal units and selects numerator units.",
  },
  {
    id: "fraction-material-translation.1",
    paths: ["representations.*.id", "representations.*.material"],
    description: "Representation IDs and material values must each be unique.",
  },
  {
    id: "fraction-material-translation.2",
    paths: ["representations", "showFractionNotation", "resolvedArrangement"],
    description:
      "Both arrangements retain distinct learners and materials. All notation uses the same supplied fraction. No ranking or learning-style diagnosis is implied.",
  },
];
