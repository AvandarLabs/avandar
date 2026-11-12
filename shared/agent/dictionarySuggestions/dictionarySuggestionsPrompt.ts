import { z } from "zod";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.ts";

/** Prompt versions the `chat` edge function serves. A shipped one is frozen. */
export const DICTIONARY_SUGGESTIONS_PROMPT_IDS = [
  "dictionary-suggestions-v1",
] as const;

/** The prompt version the browser asks for. */
export const DICTIONARY_SUGGESTIONS_PROMPT_ID = "dictionary-suggestions-v1";

/** The most tokens one suggestion reply may use, online or offline. */
export const DICTIONARY_SUGGESTIONS_MAX_TOKENS = 800;

const MAX_LABEL_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 300;

const NameSchema = z.string().min(1).max(200);
const LocaleSchema = z.string().min(1).max(35);

const SuggestionColumnSchema = z.object({
  name: NameSchema,
  otherNames: z.array(NameSchema).max(50),
  kind: z.enum([
    "categorical",
    "ordered",
    "number",
    "date",
    "text",
    "identifier",
  ]),
  values: z.array(z.string().max(200)).max(50),
});

/**
 * What the browser asks the suggestion model for: labels for one coded
 * column, or which columns record the same thing. The `chat` edge route
 * validates request bodies with it.
 */
export const DictionarySuggestionsRequestSchema = z.discriminatedUnion("task", [
  z.object({
    task: z.literal("labels"),
    locale: LocaleSchema,
    column: SuggestionColumnSchema,
  }),
  z.object({
    task: z.literal("matches"),
    locale: LocaleSchema,
    columns: z.array(SuggestionColumnSchema).min(2).max(300),
  }),
]);

/**
 * One column as the suggestion model sees it: its name, the other names it
 * goes by, its kind, and its codes when it is coded. Never its rows.
 */
export type DictionarySuggestionColumn = z.infer<typeof SuggestionColumnSchema>;

/** A suggestion request, for either model. */
export type DictionarySuggestionsRequest = z.infer<
  typeof DictionarySuggestionsRequestSchema
>;

/** One message sent to either model. */
export type DictionarySuggestionsMessage = {
  role: "system" | "user";
  content: string;
};

const LABELS_SYSTEM_PROMPT = [
  "You label the coded values of one column in a dataset, for a data dictionary.",
  "Each value is a code exactly as stored in the data. Give each one the label a reader should see, in the requested locale.",
  "Mark a value as missing when it stands for an unknown, missing, or refused answer.",
  "Also write one sentence describing what the column records.",
  "Use only the names and values given. When you cannot tell what a code means, leave its label empty.",
  'Reply with JSON only: {"labels":[{"value":"1","label":"Male","isMissing":false}],"description":"..."}',
].join(" ");

const MATCHES_SYSTEM_PROMPT = [
  "You find columns that record the same thing under different names, for a data dictionary.",
  "Each column comes from a dataset, and coded columns list some of their values.",
  "Report a pair only when both columns clearly record the same fact, such as dob and birth_date, or vax_status and mmr_status.",
  "Never pair columns that only share a word, or that record different facts with the same codes.",
  'Reply with JSON only: {"matches":[{"name":"mmr_status","sameAs":"vax_status"}]}, or {"matches":[]} when there are none.',
].join(" ");

const LABELS_JSON_SCHEMA = {
  type: "object",
  properties: {
    labels: {
      type: "array",
      items: {
        type: "object",
        properties: {
          value: { type: "string" },
          label: { type: "string" },
          isMissing: { type: "boolean" },
        },
        required: ["value", "label", "isMissing"],
        additionalProperties: false,
      },
    },
    description: { type: "string" },
  },
  required: ["labels", "description"],
  additionalProperties: false,
};

const MATCHES_JSON_SCHEMA = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, sameAs: { type: "string" } },
        required: ["name", "sameAs"],
        additionalProperties: false,
      },
    },
  },
  required: ["matches"],
  additionalProperties: false,
};

const LabelsReplySchema = z.object({
  labels: z
    .array(
      z.object({
        value: z.coerce.string(),
        label: z.string(),
        isMissing: z.boolean().catch(false),
      }),
    )
    .catch([]),
  description: z.string().catch(""),
});

const MatchesReplySchema = z.object({
  matches: z
    .array(z.object({ name: z.string(), sameAs: z.string() }))
    .catch([]),
});

function _toColumnText(
  column: Readonly<DictionarySuggestionColumn>,
): DictionarySuggestionColumn {
  return {
    name: column.name,
    otherNames: [...column.otherNames],
    kind: column.kind,
    values: [...column.values],
  };
}

/**
 * The exact text a consent to send one request covers. The browser hashes
 * it into the consent's ack token and the `chat` route hashes it again to
 * check that token, so its keys are written in one fixed order.
 */
export function stringifyDictionarySuggestionsRequest(
  request: Readonly<DictionarySuggestionsRequest>,
): string {
  return request.task === "labels"
    ? JSON.stringify({
        task: "labels",
        locale: request.locale,
        column: _toColumnText(request.column),
      })
    : JSON.stringify({
        task: "matches",
        locale: request.locale,
        columns: request.columns.map(_toColumnText),
      });
}

/** Whether the `chat` edge function serves this suggestion prompt version. */
export function isDictionarySuggestionsPromptId(value: string): boolean {
  return (DICTIONARY_SUGGESTIONS_PROMPT_IDS as readonly string[]).includes(
    value,
  );
}

/** The messages that ask either model for one request's suggestions. */
export function buildDictionarySuggestionsMessages(
  request: Readonly<DictionarySuggestionsRequest>,
): DictionarySuggestionsMessage[] {
  const isLabels = request.task === "labels";
  const input = isLabels
    ? { column: request.column }
    : { columns: request.columns };
  return [
    {
      role: "system",
      content: isLabels ? LABELS_SYSTEM_PROMPT : MATCHES_SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: `Locale: ${request.locale}\n${JSON.stringify(input)}`,
    },
  ];
}

/**
 * The JSON Schema an offline model's reply is constrained to, so a small
 * model cannot return malformed JSON.
 */
export function getDictionarySuggestionsJsonSchema(
  task: DictionarySuggestionsRequest["task"],
): object {
  return task === "labels" ? LABELS_JSON_SCHEMA : MATCHES_JSON_SCHEMA;
}

function _readJsonObject(reply: string): unknown {
  const start = reply.indexOf("{");
  const end = reply.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return undefined;
  }
  try {
    return JSON.parse(reply.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

/**
 * The labels in a model's reply, for the values that list holds only, with
 * empty labels dropped and long ones cut. Undefined when the reply holds no
 * readable JSON.
 */
export function parseDictionaryLabelSuggestions(
  reply: string,
  values: readonly string[],
): DictionaryProposal.LabelSuggestions | undefined {
  const parsed = LabelsReplySchema.safeParse(_readJsonObject(reply));
  if (!parsed.success) {
    return undefined;
  }
  const knownValues = new Set(values.map(ColumnProfile.normalizeValue));
  const labels = parsed.data.labels
    .filter((item) => {
      const isKnown = knownValues.has(ColumnProfile.normalizeValue(item.value));
      return isKnown && item.label.trim() !== "";
    })
    .map((item) => {
      const label = item.label.trim().slice(0, MAX_LABEL_LENGTH);
      return { value: item.value, label, isMissing: item.isMissing };
    });
  const description = parsed.data.description
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH);
  return { labels, description };
}

/**
 * The meaning matches in a model's reply between two different entries it
 * was asked about. Undefined when the reply holds no readable JSON.
 */
export function parseDictionaryMeaningMatches(
  reply: string,
  names: readonly string[],
): DictionaryProposal.MeaningMatch[] | undefined {
  const parsed = MatchesReplySchema.safeParse(_readJsonObject(reply));
  if (!parsed.success) {
    return undefined;
  }
  const knownNames = new Set(names);
  return parsed.data.matches
    .filter((match) => {
      return (
        knownNames.has(match.name) &&
        knownNames.has(match.sameAs) &&
        match.name !== match.sameAs
      );
    })
    .map((match) => {
      return { name: match.name, sameAs: match.sameAs };
    });
}
