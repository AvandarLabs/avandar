import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Strict complete input preserves accepted bounds and identities. */
export const inputSchema = z
  .strictObject({
    revisions: z
      .array(
        z.strictObject({
          id: z.string().max(16),
          label: z.string().min(1).max(18),
          content: z.array(z.string().min(1).max(24)).min(1).max(3),
        }),
      )
      .min(2)
      .max(4),
    restoreRevisionId: z.string().max(16),
    artifactLabel: z.string().min(1).max(24),
    statusLabels: z.strictObject({
      current: z.string().min(1).max(28),
      restored: z.string().min(1).max(28),
      history: z.string().min(1).max(28),
    }),
    showVersionLabels: z.boolean(),
    showChangedLines: z.boolean(),
    showStorageDrawer: z.boolean(),
    surface: z.enum(["page", "slate"]),
  })
  .superRefine((input, context) => {
    const selected = input.revisions.find(
      propEq("id", input.restoreRevisionId),
    );
    const current = input.revisions.at(-1)!;
    if (
      new Set(input.revisions.map(prop("id"))).size !==
        input.revisions.length ||
      !selected ||
      selected.id === current.id ||
      JSON.stringify(selected.content) === JSON.stringify(current.content)
    ) {
      context.addIssue({
        code: "custom",
        path: ["restoreRevisionId"],
        message:
          "Select a different earlier snapshot from a uniquely identified history.",
      });
    }
  }) satisfies z.ZodType;
/** Input inferred from strict runtime validation. */
export type Input = z.output<typeof inputSchema>;
/** Structural schema. Semantic rules are enforced by runtime validation. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Cross-field invariants beyond structural validation. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "saved-history",
    paths: ["revisions.*.id", "revisions.*.content", "restoreRevisionId"],
    description:
      "Revision IDs are unique. Select a nonfinal revision whose positional contents differ from the final saved revision.",
  },
];
