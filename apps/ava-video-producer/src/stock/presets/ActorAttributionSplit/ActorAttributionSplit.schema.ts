import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";

function _unique(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map(prop("id"))).size === items.length;
}
/** Strict complete authored input and cross-field domain rules. */
export const inputSchema = z
  .strictObject({
    collaborators: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(16),
          label: z.string().min(1).max(24),
          individualAccountId: z.string(),
        }),
      )
      .min(2)
      .max(2),
    accounts: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(16),
          label: z.string().min(1).max(24),
        }),
      )
      .min(3)
      .max(3),
    sharedAccountId: z.string(),
    events: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(16),
          collaboratorId: z.string(),
          label: z.string().min(1).max(24),
          phase: z.enum(["shared", "individual"]),
        }),
      )
      .min(4)
      .max(4),
    copy: z.strictObject({
      shared: z.string().min(1).max(48),
      individual: z.string().min(1).max(48),
      choice: z.string().min(1).max(48),
      historyLimit: z.string().min(1).max(48),
      ledger: z.string().min(1).max(48),
      example: z.string().min(1).max(48),
    }),
    showActionGuides: z.boolean(),
  })
  .superRefine((input, context) => {
    const accounts = new Set(input.accounts.map(prop("id")));
    const individuals = input.collaborators.map(prop("individualAccountId"));
    if (
      !_unique(input.accounts) ||
      !_unique(input.collaborators) ||
      !_unique(input.events) ||
      !accounts.has(input.sharedAccountId) ||
      new Set(individuals).size !== 2 ||
      individuals.some(
        (id) => !accounts.has(id) || id === input.sharedAccountId,
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Unique accounts and collaborators must assign two distinct non-shared accounts.",
        path: ["collaborators"],
      });
    }
    if (
      input.events.some(
        (event, index) =>
          event.phase !== (index < 2 ? "shared" : "individual") ||
          !input.collaborators.some(({ id }) => id === event.collaboratorId),
      ) ||
      input.collaborators.some(({ id }) =>
        ["shared", "individual"].some(
          (phase) =>
            input.events.filter(
              (event) => event.collaboratorId === id && event.phase === phase,
            ).length !== 1,
        ),
      )
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Each collaborator needs one shared event followed by one individual event.",
        path: ["events"],
      });
    }
  }) satisfies z.ZodType;
/** Accepted input inferred from the schema. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "authored-domain",
    paths: [
      "collaborators",
      "accounts",
      "sharedAccountId",
      "events",
      "copy",
      "showActionGuides",
    ],
    description:
      "Exactly 2 items; unique IDs 1..16 characters; labels 1..24 characters; individualAccountId references a distinct account and is not sharedAccountId Exactly 3 items; unique IDs 1..16 characters; labels 1..24 characters; exactly one shared account and one distinct individual account per collaborator Must reference an accounts ID distinct from every individualAccountId Exactly 4 events; unique IDs 1..16 characters; labels 1..24 characters; valid collaboratorId; exactly one shared event and one individual event per collaborator; two shared events precede two individual events All keys required; each string 1..48 characters; historyLimit must retain the earlier attribution limitation boolean; historical ledger entries may show only their recorded shared account, never a later individual account Free prose meaning is an author responsibility, not a language classifier.",
  },
];
