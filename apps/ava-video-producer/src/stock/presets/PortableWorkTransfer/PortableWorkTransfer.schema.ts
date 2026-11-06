import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
/** Complete collection and explicit destination acceptance state. */
export const inputSchema = z
  .strictObject({
    ownerLabel: z.string().min(1).max(24),
    tools: z.strictObject({
      source: z.string().min(1).max(24),
      destination: z.string().min(1).max(24),
    }),
    artifacts: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(20),
          label: z.string().min(1).max(24),
          kind: z.enum(["sheet", "chart", "note"]),
        }),
      )
      .min(1)
      .max(4),
    transferState: z.enum(["accepted", "awaiting-open"]),
    labels: z.strictObject({
      originals: z.string().min(1).max(34),
      copies: z.string().min(1).max(34),
      portable: z.string().min(1).max(34),
      received: z.string().min(1).max(34),
      pending: z.string().min(1).max(34),
      example: z.string().min(1).max(34),
    }),
    showIdentityTabs: z.boolean(),
  })
  .superRefine((input, context) => {
    if (input.tools.source === input.tools.destination) {
      context.addIssue({
        code: "custom",
        path: ["tools"],
        message: "Tool labels must differ.",
      });
    }
    if (
      new Set(input.artifacts.map(prop("id"))).size !== input.artifacts.length
    ) {
      context.addIssue({
        code: "custom",
        path: ["artifacts"],
        message: "Artifact IDs must be unique.",
      });
    }
  }) satisfies z.ZodType;
/** Authored output type. */
export type Input = z.output<typeof inputSchema>;
/** Structural bounds for data-only editors. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Runtime identity and distinct tool rules. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "distinct-tools",
    paths: ["tools.source", "tools.destination"],
    description: "Source and destination tool labels differ.",
  },
  {
    id: "unique-artifacts",
    paths: ["artifacts.*.id"],
    description:
      "The 1..4 artifact IDs are unique; every ID retains one original and one same-ID transfer copy, never additional unique work.",
  },
];
