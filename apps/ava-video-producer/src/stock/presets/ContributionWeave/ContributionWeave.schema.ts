import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";

const contributor: z.ZodObject<
  {
    id: z.ZodString;
    label: z.ZodString;
    pattern: z.ZodEnum<{ solid: "solid"; stripe: "stripe"; dot: "dot" }>;
  },
  z.core.$strict
> = z.strictObject({
  id: z.string().max(16),
  label: z.string().min(1).max(24),
  pattern: z.enum(["solid", "stripe", "dot"]),
});
/** Complete loom inputs preserve two independent bounded contributor arrays. */
export const inputSchema = z
  .strictObject({
    warp: z.array(contributor).min(2).max(3),
    weft: z.array(contributor).min(2).max(3),
    copy: z.strictObject({
      result: z.string().min(1).max(34),
      example: z.string().min(1).max(34),
    }),
    weaveStart: z.enum(["over-first", "under-first"]),
    showContributorEnds: z.boolean(),
    showLabels: z.boolean(),
  })
  .superRefine((input, context) => {
    const contributors = [...input.warp, ...input.weft];
    if (new Set(contributors.map(prop("id"))).size !== contributors.length) {
      context.addIssue({
        code: "custom",
        path: ["weft"],
        message: "Contributor IDs must be unique across both arrays.",
      });
    }
  }) satisfies z.ZodType;
/** Authored textile data inferred from its strict schema. */
export type Input = z.output<typeof inputSchema>;
/** Full structural schema accompanies cross-array uniqueness. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Contributor identity cannot be reused on either axis. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-contributors",
    paths: ["warp.*.id", "weft.*.id"],
    description:
      "All IDs are unique across warp and weft, including an optional empty ID.",
  },
];
