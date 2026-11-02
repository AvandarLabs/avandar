import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
/** Complete authored document with exact collection and reference bounds. */
export const inputSchema = z
  .strictObject({
    recordTitle: z.string().min(1).max(42),
    sources: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(18),
          label: z.string().min(0).max(26),
        }),
      )
      .min(2)
      .max(2),
    fields: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(18),
          label: z.string().min(0).max(22),
          candidates: z
            .array(
              z.strictObject({
                sourceId: z.string().min(0).max(18),
                value: z.string().min(0).max(26),
              }),
            )
            .min(2)
            .max(2),
          chosenSourceId: z.string().min(0).max(18).nullable(),
        }),
      )
      .min(2)
      .max(4),
    labels: z.strictObject({
      result: z.string().min(1).max(28),
      selected: z.string().min(1).max(28),
      unresolved: z.string().min(1).max(28),
      alternatives: z.string().min(1).max(28),
    }),
    showRetainedAlternatives: z.boolean(),
    decisionStyle: z.enum(["sliding-rail", "selection-bracket"]),
  })
  .superRefine((input, context) => {
    if (new Set(input.sources.map(prop("id"))).size !== 2) {
      context.addIssue({
        code: "custom",
        path: ["sources"],
        message: "Source IDs must be unique.",
      });
    }
    if (new Set(input.fields.map(prop("id"))).size !== input.fields.length) {
      context.addIssue({
        code: "custom",
        path: ["fields"],
        message: "Field IDs must be unique.",
      });
    }
    input.fields.forEach((field, index) => {
      if (
        input.sources.some(
          (source) =>
            field.candidates.filter(propEq("sourceId", source.id)).length !== 1,
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["fields", index, "candidates"],
          message: "Each source must occur exactly once.",
        });
      }
      if (
        field.chosenSourceId !== null &&
        !input.sources.some(
          propEq<{ id: unknown }, "id", unknown>("id", field.chosenSourceId),
        )
      ) {
        context.addIssue({
          code: "custom",
          path: ["fields", index, "chosenSourceId"],
          message: "Choice must reference a source or remain null.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Input inferred from the strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Cross-reference constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-identities",
    paths: ["sources.*.id", "fields.*.id"],
    description: "Source and field IDs are unique within their collections.",
  },
  {
    id: "complete-candidates",
    paths: ["fields.*.candidates", "sources"],
    description: "Every field contains each source exactly once.",
  },
  {
    id: "explicit-choice",
    paths: ["fields.*.chosenSourceId", "sources.*.id"],
    description:
      "Choices are null or exact source IDs, including empty IDs when present.",
  },
];
