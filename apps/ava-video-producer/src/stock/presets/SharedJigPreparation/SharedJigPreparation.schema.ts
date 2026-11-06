import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** A complete authored workshop with one reusable marking guide. */
export const inputSchema = z
  .strictObject({
    makerLabel: z.string().min(1).max(24),
    guide: z.strictObject({
      label: z.string().min(1).max(24),
      pattern: z.enum(["two-holes", "corner-mark"]),
    }),
    collaborators: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(18),
          workpieceLabel: z.string().min(1).max(24),
        }),
      )
      .min(1)
      .max(3),
    labels: z.strictObject({
      prepare: z.string().min(1).max(34),
      apply: z.string().min(1).max(34),
      retained: z.string().min(1).max(34),
      example: z.string().min(1).max(34),
    }),
    workpieceMaterial: z.enum(["card", "fabric"]),
    showAlignmentGuides: z.boolean(),
  })
  .superRefine((input, context) => {
    if (
      new Set(input.collaborators.map(prop("id"))).size !==
      input.collaborators.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["collaborators"],
        message: "Collaborator IDs must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Authored output type. */
export type Input = z.output<typeof inputSchema>;
/** Structural bounds for data-only editors. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Constraints applied in addition to structural bounds. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-collaborators",
    paths: ["collaborators.*.id"],
    description:
      "The 1..3 collaborator IDs are unique. Array order owns guide applications; each collaborator retains one original workpiece.",
  },
];
