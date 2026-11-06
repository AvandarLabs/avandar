import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict complete inputs preserve authored text and structural invariants. */
export const inputSchema = z
  .strictObject({
    people: z.strictObject({
      requester: z.string().min(1).max(18),
      colleague: z.string().min(1).max(18),
    }),
    task: z.strictObject({
      label: z.string().min(1).max(28),
      kind: z.enum(["document", "assembly"]),
    }),
    requestText: z.string().min(1).max(48),
    response: z.strictObject({
      state: z.enum(["joins", "later", "declines"]),
      text: z.string().min(1).max(48),
    }),
    labels: z.strictObject({
      ownedBy: z.string().min(1).max(32),
      open: z.string().min(1).max(32),
      shared: z.string().min(1).max(32),
      example: z.string().min(1).max(32),
    }),
    showRequestAtHold: z.boolean(),
  })
  .superRefine((input, context) => {
    if (input.people.requester === input.people.colleague) {
      context.addIssue({
        code: "custom",
        path: ["people"],
        message: "Participant labels must differ.",
      });
    }
  }) satisfies z.ZodType;
/** Authored input inferred from its strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Complete structural JSON Schema, without runtime cross-field refinements. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Runtime-only reference, uniqueness and cross-field constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "distinct-people",
    paths: ["people.requester", "people.colleague"],
    description: "The participant labels must be distinct.",
  },
];
