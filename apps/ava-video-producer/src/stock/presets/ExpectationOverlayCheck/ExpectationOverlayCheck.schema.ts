import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";

function _unique(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map(prop("id"))).size === items.length;
}
/** Strict complete authored input and cross-field domain rules. */
export const inputSchema = z
  .strictObject({
    tests: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(24),
          inputLabel: z.string().min(1).max(24),
          expected: z.string().min(1).max(20),
          observed: z.string().min(1).max(20).nullable(),
        }),
      )
      .min(1)
      .max(3),
    labels: z.strictObject({
      expected: z.string().min(1).max(22),
      observed: z.string().min(1).max(22),
      match: z.string().min(1).max(22),
      mismatch: z.string().min(1).max(22),
      untested: z.string().min(1).max(22),
    }),
    sheetMotion: z.enum(["lower", "hinge"]),
    showInputs: z.boolean(),
    showStateGlyphs: z.boolean(),
    exampleLabel: z.string().min(1).max(48),
  })
  .superRefine((input, context) => {
    if (!_unique(input.tests)) {
      context.addIssue({
        code: "custom",
        message: "Test identities must be unique.",
        path: ["tests"],
      });
    }
  }) satisfies z.ZodType;
/** Accepted input inferred from the schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "authored-domain",
    paths: [
      "tests",
      "labels",
      "sheetMotion",
      "showInputs",
      "showStateGlyphs",
      "exampleLabel",
    ],
    description:
      "1..3 cases; unique IDs 1..20 characters; label and inputLabel 1..24 characters; expected and non-null observed 1..20 characters; exact case-sensitive string equality defines match; null means unobserved, never failure. Each value 1..22 characters. Presentation only; both modes use identical case comparisons. Boolean; hiding it does not change results. Boolean; state wording always remains visible. 1..48 characters. Free prose meaning is an author responsibility, not a language classifier.",
  },
];
