import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
const label: z.ZodString = z.string().min(1).max(28);
/** Strict single-object, two-distinct-holder handoff. */
export const inputSchema = z
  .strictObject({
    holders: z.strictObject({ sender: label, recipient: label }),
    object: z.strictObject({ label, details: z.array(label).max(3) }),
    outcome: z.enum(["accepted", "awaiting-acceptance"]),
    copy: z.strictObject({
      offered: z.string().min(1).max(30),
      accepted: z.string().min(1).max(30),
      waiting: z.string().min(1).max(30),
      responsible: z.string().min(1).max(30),
      example: z.string().min(1).max(30),
    }),
    objectShape: z.enum(["folio", "baton", "key"]),
    showResponsibilityMarker: z.boolean(),
    showLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    if (input.holders.sender === input.holders.recipient) {
      context.addIssue({
        code: "custom",
        path: ["holders", "recipient"],
        message: "The holders must differ.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred authored handoff data. */
export type Input = z.output<typeof inputSchema>;
/** Complete structural bounds accompany runtime semantic checks. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Two names identify distinct supports. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "distinct-holders",
    paths: ["holders.sender", "holders.recipient"],
    description: "Sender and recipient must differ.",
  },
];
