import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
const personSchema: z.ZodObject<
  { id: z.ZodString; label: z.ZodString; roleLabel: z.ZodString },
  z.core.$strict
> = z.strictObject({
  id: z.string().min(1).max(20),
  label: z.string().min(1).max(18),
  roleLabel: z.string().min(1).max(24),
});
const topicSchema = z.strictObject({
  id: z.string().min(1).max(20),
  label: z.string().min(1).max(24),
  expertId: z.string().min(1).max(20),
  demonstration: z.enum(["fold-guide", "align-ruler"]),
}) satisfies z.ZodType;
/** Strict complete inputs preserve authored text and structural invariants. */
export const inputSchema = z
  .strictObject({
    people: z.array(personSchema).length(2),
    topics: z.array(topicSchema).length(2),
    labels: z.strictObject({
      demonstrates: z.string().min(1).max(30),
      learns: z.string().min(1).max(30),
      example: z.string().min(1).max(30),
    }),
    showJobRoles: z.boolean(),
    tableArrangement: z.enum(["side-by-side", "opposite-sides"]),
    closingLabel: z.string().min(1).max(48),
  })
  .superRefine((input, context) => {
    if (new Set(input.people.map(prop("id"))).size !== input.people.length) {
      context.addIssue({
        code: "custom",
        path: ["people"],
        message: "Person IDs must be unique.",
      });
    }
    if (new Set(input.topics.map(prop("id"))).size !== input.topics.length) {
      context.addIssue({
        code: "custom",
        path: ["topics"],
        message: "Topic IDs must be unique.",
      });
    }
    if (
      input.topics.some(
        (topic) => !input.people.some(propEq("id", topic.expertId)),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["topics"],
        message: "Each expert must reference a person.",
      });
    }
    if (
      input.topics.length === 2 &&
      input.topics[0].expertId === input.topics[1].expertId
    ) {
      context.addIssue({
        code: "custom",
        path: ["topics"],
        message: "The two topics must have different experts.",
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
    id: "unique-people",
    paths: ["people.*.id"],
    description: "Exactly two people have unique IDs of 1..20 characters.",
  },
  {
    id: "unique-topics",
    paths: ["topics.*.id"],
    description: "Exactly two topics have unique IDs of 1..20 characters.",
  },
  {
    id: "topic-experts",
    paths: ["topics.*.expertId", "people.*.id"],
    description:
      "Each topic expertId references a person. The two topic expertIds must differ.",
  },
];
