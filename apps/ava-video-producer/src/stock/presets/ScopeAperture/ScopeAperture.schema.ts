import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored content with strict nested fields and accepted bounds. */
export const inputSchema = z
  .strictObject({
    broadTopic: z.string().min(1).max(44),
    topics: z
      .array(
        z.strictObject({
          id: z.string().max(20),
          label: z.string().min(1).max(22),
          included: z.boolean(),
        }),
      )
      .min(3)
      .max(6),
    focusedQuestion: z.string().min(1).max(52),
    outsideLabel: z.string().min(1).max(34),
    insideLabel: z.string().min(1).max(24),
    showExcludedTopics: z.boolean(),
  })
  .superRefine((input, context) => {
    if (new Set(input.topics.map(prop("id"))).size !== input.topics.length) {
      context.addIssue({
        code: "custom",
        path: ["topics"],
        message: "Collection IDs must be unique.",
      });
    }
    const included = input.topics.filter(prop("included")).length;
    if (included < 1 || included > 3 || included === input.topics.length) {
      context.addIssue({
        code: "custom",
        path: ["topics"],
        message:
          "Choose one to three included topics and at least one excluded topic.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred renderer input. */
export type Input = z.output<typeof inputSchema>;
/** Authored relationships beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "topics-unique-ids",
    paths: ["topics.*.id"],
    description: "Collection IDs must be unique.",
  },
  {
    id: "explicit-scope-membership",
    paths: ["topics.*.included"],
    description:
      "One to three topics are included and at least one topic is excluded.",
  },
];
