import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
const SEMANTIC_ROLES: readonly [
  "subject",
  "metric",
  "value",
  "unit",
  "period",
  "qualifier",
] = ["subject", "metric", "value", "unit", "period", "qualifier"] as const;
function _validFragment(
  fragment: Readonly<z.infer<typeof fragmentSchema>>,
): boolean {
  if (fragment.role === "connector") {
    return fragment.contentStart === 0 && fragment.contentEnd === 0;
  }
  const text = fragment.text
    .slice(fragment.contentStart, fragment.contentEnd)
    .trim();
  return (
    fragment.contentStart < fragment.contentEnd &&
    fragment.contentEnd <= fragment.text.length &&
    text.length >= 1 &&
    text.length <= 20 &&
    (fragment.role !== "value" ||
      (/^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text) &&
        Number.isFinite(Number(text))))
  );
}
const fragmentSchema = z.strictObject({
  id: z.string().min(1).max(12),
  text: z.string().min(1).max(30),
  role: z.enum([...SEMANTIC_ROLES, "connector"]),
  contentStart: z.number().int().min(0).max(30),
  contentEnd: z.number().int().min(0).max(30),
}) satisfies z.ZodType;
/** Strict authored spans and independent extraction/review settings. */
export const inputSchema = z
  .strictObject({
    fragments: z.array(fragmentSchema).min(6).max(9),
    showSourceSpans: z.boolean(),
    method: z.enum(["rules", "model-assisted"]),
    reviewState: z.enum(["reviewed", "needs-review"]),
    copy: z.strictObject({
      context: z.string().min(1).max(34),
      source: z.string().min(1).max(34),
      result: z.string().min(1).max(34),
    }),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.fragments.map(prop("id"))).size !==
        input.fragments.length ||
      input.fragments.reduce((total, { text }) => total + text.length, 0) >
        110 ||
      SEMANTIC_ROLES.some(
        (role) => input.fragments.filter(propEq("role", role)).length !== 1,
      ) ||
      input.fragments.some((f) => !_validFragment(f))
    ) {
      context.addIssue({
        code: "custom",
        path: ["fragments"],
        message:
          "Unique IDs, one of every semantic role, valid exact spans and a sentence of at most 110 UTF-16 units are required.",
      });
    }
  }) satisfies z.ZodType;

/** Accepted complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field rules beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "exact-authored-domain",
    paths: ["fragments", "showSourceSpans", "method", "reviewState", "copy"],
    description:
      "All IDs are unique and exactly one of each semantic role occurs. Concatenated UTF-16 text length <=110. Semantic offsets are integers with 0<=start<end<=fragment.text.length and trimmed selections are 1..20 UTF-16 units. Connectors have start=end=0. The value selection is a finite plain decimal, optional minus, no exponent or separators. Method and review state remain independent. Source and every output value derive from exact authored fragments, never independent output props. Prose meaning, fictional context and suitability are author responsibilities rather than natural-language runtime classification.",
  },
];
