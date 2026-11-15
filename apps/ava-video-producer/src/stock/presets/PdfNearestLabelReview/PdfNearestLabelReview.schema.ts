import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";

const positionSchema: z.ZodNumber = z.number().min(5).max(95);
/** Literal source anchors, uncertainty threshold and explicit human choice. */
export const inputSchema = z
  .strictObject({
    figure: z.strictObject({
      text: z.string().min(1).max(12),
      x: positionSchema,
      y: positionSchema,
    }),
    labels: z
      .array(
        z.strictObject({
          id: z.string().max(12),
          text: z.string().min(1).max(20),
          x: positionSchema,
          y: positionSchema,
        }),
      )
      .length(2),
    ambiguityThreshold: z.number().min(0.5).max(1),
    reviewedLabelId: z.string().max(12).nullable(),
    showDistanceValues: z.boolean(),
    copy: z.strictObject({
      context: z.string().min(1).max(34),
      source: z.string().min(1).max(34),
      result: z.string().min(1).max(34),
    }),
  })
  .superRefine((input, context) => {
    if (new Set(input.labels.map(prop("id"))).size !== input.labels.length) {
      context.addIssue({
        code: "custom",
        path: ["labels"],
        message: "The two label IDs must be unique, including an empty ID.",
      });
    }
    input.labels.forEach((label, index) => {
      if (label.x === input.figure.x && label.y === input.figure.y) {
        context.addIssue({
          code: "custom",
          path: ["labels", index],
          message:
            "A label must not coincide with the figure. Equal label distances and anchors are allowed.",
        });
      }
    });
    if (
      input.reviewedLabelId !== null &&
      !input.labels.some(({ id }) => id === input.reviewedLabelId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["reviewedLabelId"],
        message:
          "Review must be null or reference a supplied label, including an empty ID.",
      });
    }
  }) satisfies z.ZodType;
/** Inferred complete authored input. */
export type Input = z.output<typeof inputSchema>;
/** Full structural schema. Semantic constraints remain runtime validated. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Explicit runtime invariants beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-labels",
    paths: ["labels.*.id"],
    description:
      "Exactly two label IDs are unique. An empty ID is accepted and differs from null unresolved review.",
  },
  {
    id: "noncoincident-figure",
    paths: ["figure.x", "figure.y", "labels.*.x", "labels.*.y"],
    description:
      "Neither label anchor coincides with the figure anchor. Equal distances and coincident label anchors are allowed without minimum separation.",
  },
  {
    id: "review-reference",
    paths: ["reviewedLabelId", "labels.*.id"],
    description:
      "Review is null or an existing label ID, including empty. Human choice overrides nearest suggestion without changing source text, distances or the nearest/next distance ratio. Ambiguity uses ratio >= threshold, including equality; the ratio is not a probability.",
  },
];
