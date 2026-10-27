import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";

const contribution: z.ZodObject<
  {
    id: z.ZodString;
    label: z.ZodString;
    artifact: z.ZodEnum<{
      repair: "repair";
      drawing: "drawing";
      guide: "guide";
    }>;
  },
  z.core.$strict
> = z.strictObject({
  id: z.string().min(1).max(20),
  label: z.string().min(1).max(28),
  artifact: z.enum(["guide", "repair", "drawing"]),
});
/** Strict complete inputs preserve authored text and structural invariants. */
export const inputSchema = z
  .strictObject({
    people: z.strictObject({
      contributor: z.string().min(1).max(18),
      colleague: z.string().min(1).max(18),
    }),
    contributions: z.array(contribution).min(1).max(2),
    focusedContributionId: z.string().min(1).max(20),
    acknowledgment: z.strictObject({
      text: z.string().min(1).max(52),
      form: z.enum(["spoken", "note"]),
    }),
    showAuthorshipTab: z.boolean(),
    exampleLabel: z.string().min(1).max(44),
  })
  .superRefine((input, context) => {
    if (input.people.contributor === input.people.colleague) {
      context.addIssue({
        code: "custom",
        path: ["people"],
        message: "Participant labels must differ.",
      });
    }
    if (
      new Set(input.contributions.map(prop("id"))).size !==
      input.contributions.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["contributions"],
        message: "Contribution IDs must be unique.",
      });
    }
    if (!input.contributions.some(propEq("id", input.focusedContributionId))) {
      context.addIssue({
        code: "custom",
        path: ["focusedContributionId"],
        message: "Focus must reference a contribution.",
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
    paths: ["people.contributor", "people.colleague"],
    description: "The participant labels must be distinct.",
  },
  {
    id: "unique-contributions",
    paths: ["contributions.*.id"],
    description:
      "One or two contributions have unique IDs of 1..20 characters.",
  },
  {
    id: "referenced-focus",
    paths: ["focusedContributionId", "contributions.*.id"],
    description: "focusedContributionId references one supplied contribution.",
  },
];
