import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored input. No partial-input defaults or inferred values. */
export const inputSchema = z
  .strictObject({
    title: z.string().min(1).max(46),
    steps: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(18),
          label: z.string().min(0).max(24),
          isInserted: z.boolean(),
        }),
      )
      .min(3)
      .max(5),
    editLabel: z.string().min(1).max(30),
    preview: z.strictObject({
      inputLabel: z.string().min(0).max(22),
      inputValue: z.string().min(0).max(30),
      outputLabel: z.string().min(0).max(22),
      outputValue: z.string().min(0).max(30),
    }),
    showPreview: z.boolean(),
    joinStyle: z.enum(["tabbed", "continuous-ribbon"]),
  })
  .superRefine((input, context) => {
    if (new Set(input.steps.map(prop("id"))).size !== input.steps.length) {
      context.addIssue({
        code: "custom",
        path: ["steps"],
        message: "Collection IDs must be unique.",
      });
    }
    const insertedIndices = input.steps.flatMap((step, index) =>
      step.isInserted ? [index] : [],
    );
    if (
      insertedIndices.length !== 1 ||
      insertedIndices[0] === 0 ||
      insertedIndices[0] === input.steps.length - 1
    ) {
      context.addIssue({
        code: "custom",
        path: ["steps"],
        message:
          "Exactly one inserted step must have a predecessor and successor.",
      });
    }
  }) satisfies z.ZodType;
/** Schema-inferred renderer input. */
export type Input = z.output<typeof inputSchema>;
/** Runtime constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "steps-unique-ids",
    paths: ["steps.*.id"],
    description: "Collection IDs must be unique.",
  },
  {
    id: "one-middle-insertion",
    paths: ["steps.*.isInserted"],
    description:
      "Exactly one step is inserted, with both a predecessor and a successor. Final array order defines the requested gap.",
  },
];
