import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Strict complete authored input without coercion or field defaults. */
export const inputSchema = z
  .strictObject({
    values: z.array(z.string().min(1).max(16)).min(3).max(6),
    policy: z.enum(["widen-to-text", "hold-for-review"]),
    labels: z.strictObject({
      column: z.string().min(1).max(30),
      provisional: z.string().min(1).max(30),
      text: z.string().min(1).max(30),
      review: z.string().min(1).max(30),
      rows: z.string().min(1).max(30),
    }),
    showOriginalStrings: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(36),
      source: z.string().min(1).max(36),
      result: z.string().min(1).max(36),
    }),
  })
  .superRefine((input, context) => {
    const isNumeric = (value: string) =>
      /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) &&
      Number.isFinite(Number(value));
    if (
      input.values.slice(0, -1).some((value) => !isNumeric(value)) ||
      isNumeric(input.values.at(-1) ?? "")
    ) {
      context.addIssue({
        code: "custom",
        path: ["values"],
        message:
          "Initial values must be finite decimal strings, with one final nonnumeric value.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred accepted document. */
export type Input = z.infer<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "late-evidence",
    paths: ["values", "policy"],
    description:
      "The first 2..5 strings must match finite decimal syntax with optional sign and decimal point, without exponent or whitespace coercion. The last string must not be such a numeric string. Both policies preserve every exact lexical form in order. Widening yields text. Holding completes no import. Neither implies safe numeric aggregation.",
  },
];
