import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
function _unique(items: ReadonlyArray<{ id: string }>): boolean {
  return new Set(items.map(prop("id"))).size === items.length;
}
function _normalizePhrase(text: string): string {
  const trimmed = text.replace(/^[\s\p{P}]+|[\s\p{P}]+$/gu, "");
  return trimmed.replace(/^(?:a|an|the)\s+/iu, "").toLowerCase();
}
/** Strict complete authored input and cross-field domain rules. */
export const inputSchema = z
  .strictObject({
    sentenceParts: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(16),
          text: z.string().min(1).max(28),
        }),
      )
      .min(3)
      .max(7),
    draft: z.strictObject({
      entities: z
        .array(
          z.strictObject({
            id: z.string().min(1).max(20),
            label: z.string().min(1).max(24),
            partId: z.string(),
          }),
        )
        .min(2)
        .max(2),
      relationships: z
        .array(
          z.strictObject({
            id: z.string().min(1).max(20),
            label: z.string().min(1).max(24),
            partId: z.string(),
            fromEntityId: z.string(),
            toEntityId: z.string(),
          }),
        )
        .min(1)
        .max(1),
      attributes: z
        .array(
          z.strictObject({
            id: z.string().min(1).max(20),
            label: z.string().min(1).max(24),
            partId: z.string(),
            entityId: z.string(),
          }),
        )
        .min(0)
        .max(1),
    }),
    review: z.strictObject({
      outcome: z.enum(["accept", "pending"]),
      reviewerLabel: z.string().min(1).max(28),
      note: z.string().min(1).max(44),
    }),
    copy: z.strictObject({
      source: z.string().min(1).max(48),
      draft: z.string().min(1).max(48),
      entity: z.string().min(1).max(18),
      relationship: z.string().min(1).max(18),
      attribute: z.string().min(1).max(18),
      accepted: z.string().min(1).max(48),
      pending: z.string().min(1).max(48),
      example: z.string().min(1).max(48),
    }),
    showSourceGuides: z.boolean(),
    modelLayout: z.enum(["horizontal", "stacked"]),
  })
  .superRefine((input, context) => {
    const items = [
      ...input.draft.entities,
      ...input.draft.relationships,
      ...input.draft.attributes,
    ];
    if (
      !_unique(input.sentenceParts) ||
      input.sentenceParts.map(prop("text")).join("").length > 90 ||
      !_unique(items) ||
      new Set(items.map(prop("partId"))).size !== items.length
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Unique source/model identities and distinct part references need a sentence of at most 90 characters.",
        path: ["sentenceParts"],
      });
    }
    items.forEach((item) => {
      const part = input.sentenceParts.find(({ id }) => id === item.partId);
      const label = _normalizePhrase(item.label);
      if (!part || !label || !_normalizePhrase(part.text).includes(label)) {
        context.addIssue({
          code: "custom",
          message:
            "Each label must match its referenced authored fragment under the documented lexical rule.",
          path: ["draft"],
        });
      }
    });
    const entities = new Set(input.draft.entities.map(prop("id")));
    if (
      input.draft.relationships.some(
        (item) =>
          !entities.has(item.fromEntityId) ||
          !entities.has(item.toEntityId) ||
          item.fromEntityId === item.toEntityId,
      ) ||
      input.draft.attributes.some((item) => !entities.has(item.entityId))
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Relationship endpoints are distinct valid entities and attributes attach to an existing entity.",
        path: ["draft"],
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
      "sentenceParts",
      "draft",
      "review",
      "copy",
      "showSourceGuides",
      "modelLayout",
    ],
    description:
      "3..7 parts; unique IDs 1..16 characters; each text 1..28 characters; concatenated sentence 1..90 characters; no generated words Exactly 2 entities, exactly 1 directed relationship between distinct valid entity IDs, and 0..1 attribute attached to a valid entity; model IDs unique across arrays 1..20 characters; labels 1..24 characters; each partId valid and used by at most one model item; mapped labels must be a case-insensitive substring of their referenced text after trimming punctuation and articles; no inferred cardinality or type constraints outcome accept or pending; reviewerLabel 1..28 characters; note 1..44 characters; accept is supplied approval, never inferred from a well-formed draft All keys required; role labels 1..18 characters; other labels 1..48 characters; draft status and example qualifier remain visible boolean; all model part references remain valid even when guides are hidden horizontal or stacked; from/to direction must remain unambiguous in both layouts Free prose meaning is an author responsibility, not a language classifier.",
  },
  {
    id: "lexical-mapping",
    paths: ["sentenceParts", "draft"],
    description:
      "Trim surrounding Unicode punctuation and whitespace, remove at most one leading English article a/an/the case-insensitively only when followed by whitespace, then locale-independent lowercase. The nonempty normalized label must be a substring of its referenced normalized fragment. Internal punctuation, accents and compatibility forms remain unchanged.",
  },
];
