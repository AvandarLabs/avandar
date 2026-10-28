import { prop } from "@avandar/utils";
import { z } from "zod";
import type {
  StockJsonSchema,
  StockSemanticRule,
} from "../../contracts/StockContract.types";
const issueSchema = z.strictObject({
  id: z.string().min(1).max(20),
  label: z.string().min(1).max(28),
  state: z.enum(["resolved", "open"]),
  releaseRole: z.enum(["blocking", "follow-up"]),
  owner: z.string().max(18),
  dueLabel: z.string().max(24),
}) satisfies z.ZodType;
/** Strict complete inputs preserve authored text and structural invariants. */
export const inputSchema = z
  .strictObject({
    artifact: z.strictObject({
      label: z.string().min(1).max(28),
      kind: z.enum(["guide", "prototype"]),
    }),
    issues: z.array(issueSchema).min(1).max(4),
    recipientLabel: z.string().min(1).max(24),
    labels: z.strictObject({
      ready: z.string().min(1).max(28),
      held: z.string().min(1).max(28),
      limitations: z.string().min(1).max(28),
      register: z.string().min(1).max(28),
      resolved: z.string().min(1).max(28),
      open: z.string().min(1).max(28),
      example: z.string().min(1).max(28),
    }),
    showResolvedIssues: z.boolean(),
    issueMarks: z.enum(["tabs", "margin-notches"]),
  })
  .superRefine((input, context) => {
    if (new Set(input.issues.map(prop("id"))).size !== input.issues.length) {
      context.addIssue({
        code: "custom",
        path: ["issues"],
        message: "Issue IDs must be unique.",
      });
    }
    input.issues.forEach((issue, index) => {
      if (
        issue.state === "open" &&
        issue.releaseRole === "follow-up" &&
        (!issue.owner.length || !issue.dueLabel.length)
      ) {
        context.addIssue({
          code: "custom",
          path: ["issues", index],
          message: "Open follow-ups require nonempty owner and due label.",
        });
      }
    });
  }) satisfies z.ZodType;
/** Authored input inferred from its strict runtime schema. */
export type Input = z.output<typeof inputSchema>;
/** Complete structural JSON Schema, without runtime cross-field refinements. */
export const jsonSchema: StockJsonSchema = z.toJSONSchema(inputSchema);
/** Runtime-only reference, uniqueness and cross-field constraints. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-issues",
    paths: ["issues.*.id"],
    description: "One to four issues have unique IDs of 1..20 characters.",
  },
  {
    id: "owned-follow-ups",
    paths: [
      "issues.*.state",
      "issues.*.releaseRole",
      "issues.*.owner",
      "issues.*.dueLabel",
    ],
    description:
      "Every open follow-up requires nonempty owner (1..18) and dueLabel (1..24). Other issues permit empty owner and dueLabel.",
  },
];
