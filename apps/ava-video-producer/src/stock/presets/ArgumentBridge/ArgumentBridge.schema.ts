import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored content with strict nested fields and accepted bounds. */
export const inputSchema = z
  .strictObject({
    premises: z
      .array(
        z.strictObject({
          id: z.string().max(20),
          text: z.string().min(1).max(48),
        }),
      )
      .min(2)
      .max(3),
    conclusion: z.string().min(1).max(64),
    relationship: z.enum(["supports", "requires", "suggests"]),
    connectorText: z.string().min(1).max(30),
    premiseHeading: z.string().min(0).max(42),
    showIndividualSupports: z.boolean(),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.premises.map(prop("id"))).size !== input.premises.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["premises"],
        message: "Collection IDs must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred renderer input. */
export type Input = z.output<typeof inputSchema>;
/** Authored relationships beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "premises-unique-ids",
    paths: ["premises.*.id"],
    description: "Collection IDs must be unique.",
  },
  {
    id: "authored-connector-agreement",
    paths: ["relationship", "connectorText"],
    description:
      "The author must supply connective language that agrees with the selected relationship. Natural-language agreement is not inferred by the renderer.",
  },
];
