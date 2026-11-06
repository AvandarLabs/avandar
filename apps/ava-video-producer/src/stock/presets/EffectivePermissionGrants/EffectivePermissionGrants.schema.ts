import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";

const grantSchema = z.strictObject({
  id: z.string().min(1).max(12),
  label: z.string().min(1).max(20),
  kind: z.enum(["app-default", "direct", "group", "workspace"]),
  role: z.enum(["viewer", "editor", "admin"]),
  eligible: z.boolean(),
}) satisfies z.ZodType;
/** Explicit eligibility and maximum-rank action requirements. */
export const inputSchema = z
  .strictObject({
    grants: z.array(grantSchema).min(1).max(5),
    restricted: z.boolean(),
    requiredRole: z.enum(["viewer", "editor", "admin"]),
    labels: z.strictObject({
      resource: z.string().min(1).max(26),
      none: z.string().min(1).max(26),
      viewer: z.string().min(1).max(26),
      editor: z.string().min(1).max(26),
      admin: z.string().min(1).max(26),
      allowed: z.string().min(1).max(26),
      denied: z.string().min(1).max(26),
    }),
    showExcludedGrants: z.boolean(),
  })
  .superRefine((input, context) => {
    if (new Set(input.grants.map(prop("id"))).size !== input.grants.length) {
      context.addIssue({
        code: "custom",
        path: ["grants"],
        message: "Grant IDs must be unique.",
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
    id: "unique-grants",
    paths: ["grants.*.id"],
    description:
      "The 1..5 candidate grant IDs are unique. Explicit eligibility is not inferred from labels. Restriction excludes only app-default grants. The maximum eligible rank is compared to requiredRole.",
  },
];
