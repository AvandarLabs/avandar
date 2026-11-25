import { z } from "zod";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.ts";

/**
 * Prompt versions the `chat` edge function serves. A shipped one is frozen:
 * v1 serves labels and matches only, v2 adds descriptions.
 */
export const DICTIONARY_SUGGESTIONS_PROMPT_IDS = [
  "dictionary-suggestions-v1",
  "dictionary-suggestions-v2",
] as const;

/** The prompt version the browser asks for. */
export const DICTIONARY_SUGGESTIONS_PROMPT_ID = "dictionary-suggestions-v2";

const MATCHES_MAX_TOKENS = 800;
const LABELS_BASE_TOKENS = 300;
const LABELS_TOKENS_PER_VALUE = 25;
const LABELS_MAX_TOKENS = 3000;
const DESCRIBE_MAX_TOKENS = 300;

/**
 * A pessimistic count of characters per token, for sizing a prompt against
 * a model's context window before it is sent. The reply budget and the
 * browser's check that a request fits the offline model both use it.
 */
export const DICTIONARY_SUGGESTIONS_CHARACTERS_PER_TOKEN = 3;

const MAX_LABEL_LENGTH = 80;
const MAX_DESCRIPTION_LENGTH = 300;

/**
 * The longest one code may be in a request. A longer code is a sign the
 * column is not really coded, and the browser sends no codes for a column
 * that has one, since cutting a code short would break mapping its label
 * back.
 */
export const DICTIONARY_SUGGESTIONS_MAX_VALUE_LENGTH = 200;

/** The most other names one column may carry in a request. */
export const DICTIONARY_SUGGESTIONS_MAX_OTHER_NAMES = 50;

/** The most dataset names one describe request may carry. */
export const DICTIONARY_SUGGESTIONS_MAX_DATASET_NAMES = 20;

/**
 * The longest an existing description may be in a describe request. The
 * browser cuts a longer one, since it is only context for the model.
 */
export const DICTIONARY_SUGGESTIONS_MAX_EXISTING_DESCRIPTION_LENGTH = 2000;

/** The most columns one matches request may carry. */
export const DICTIONARY_SUGGESTIONS_MAX_MATCH_COLUMNS = 300;

/** The most codes one column may carry in a matches request. */
export const DICTIONARY_SUGGESTIONS_MAX_MATCH_VALUES = 12;

/**
 * The longest a request's consent text may be, as written by
 * `stringifyDictionarySuggestionsRequest`. The browser drops columns from a
 * matches request until it fits, and the `chat` route refuses a longer one.
 */
export const DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH = 60_000;

/**
 * Words in a column name that mean its values identify a person or how to
 * reach one. Such a column's values are never sent; its name still is. The
 * browser leaves those values out of a request and the `chat` route refuses
 * a request that has them, both through `isIdentifyingColumnName`.
 */
export const IDENTIFYING_WORDS: ReadonlySet<string> = new Set([
  "name",
  "firstname",
  "lastname",
  "fullname",
  "surname",
  "nickname",
  "email",
  "phone",
  "mobile",
  "telephone",
  "address",
  "street",
  "ssn",
  "passport",
  "license",
  "mrn",
  "zip",
  "postal",
  "patient",
  "contact",
  "guardian",
  "parent",
  "fname",
  "lname",
]);

/**
 * Whether a column's name holds one of `IDENTIFYING_WORDS`, so its values
 * must stay on the device. For example `first_name` or `PatientEmail`.
 */
export function isIdentifyingColumnName(columnName: string): boolean {
  return ColumnProfile.getTokensFromColumnName(columnName).some((token) => {
    return IDENTIFYING_WORDS.has(token);
  });
}

/** The longest a column or list name may be in a request. */
export const DICTIONARY_SUGGESTIONS_MAX_NAME_LENGTH = 200;

const NameSchema = z
  .string()
  .min(1)
  .max(DICTIONARY_SUGGESTIONS_MAX_NAME_LENGTH);
const LocaleSchema = z.string().min(1).max(35);

/**
 * One column of a request, with at most `maxValues` codes. Codes are only
 * allowed on a coded column whose names do not identify people.
 */
function _makeColumnSchema(maxValues: number) {
  return z
    .object({
      name: NameSchema,
      otherNames: z
        .array(NameSchema)
        .max(DICTIONARY_SUGGESTIONS_MAX_OTHER_NAMES),
      kind: z.enum([
        "categorical",
        "ordered",
        "number",
        "date",
        "text",
        "identifier",
      ]),
      values: z
        .array(z.string().max(DICTIONARY_SUGGESTIONS_MAX_VALUE_LENGTH))
        .max(maxValues),
    })
    .superRefine((column, context) => {
      if (column.values.length === 0) {
        return;
      }
      if (column.kind !== "categorical" && column.kind !== "ordered") {
        context.addIssue({
          code: "custom",
          message: "Only a coded column may send its values.",
          path: ["values"],
        });
      }
      if ([column.name, ...column.otherNames].some(isIdentifyingColumnName)) {
        context.addIssue({
          code: "custom",
          message: "A column named after a person may not send its values.",
          path: ["values"],
        });
      }
    });
}

const SuggestionColumnSchema = _makeColumnSchema(
  ColumnProfile.MAX_LISTED_VALUES,
);

/**
 * What the browser asks the suggestion model for: labels for one coded
 * column, a description of one column, or which columns record the same
 * thing. The `chat` edge route
 * validates request bodies with it, and tells a request too long to consent
 * to from an invalid one with `isDictionarySuggestionsRequestTooLarge`.
 */
export const DictionarySuggestionsRequestSchema = z
  .discriminatedUnion("task", [
    z.object({
      task: z.literal("labels"),
      locale: LocaleSchema,
      column: SuggestionColumnSchema,
    }),
    z.object({
      task: z.literal("describe"),
      locale: LocaleSchema,
      column: SuggestionColumnSchema,
      datasetNames: z
        .array(NameSchema)
        .max(DICTIONARY_SUGGESTIONS_MAX_DATASET_NAMES),
      /** What the user already wrote, or an empty string. */
      description: z
        .string()
        .max(DICTIONARY_SUGGESTIONS_MAX_EXISTING_DESCRIPTION_LENGTH),
    }),
    z.object({
      task: z.literal("matches"),
      locale: LocaleSchema,
      columns: z
        .array(_makeColumnSchema(DICTIONARY_SUGGESTIONS_MAX_MATCH_VALUES))
        .min(2)
        .max(DICTIONARY_SUGGESTIONS_MAX_MATCH_COLUMNS),
    }),
  ])
  .superRefine((request, context) => {
    const { length } = stringifyDictionarySuggestionsRequest(request);
    if (length > DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH) {
      context.addIssue({
        code: "custom",
        message: `The request is ${length} characters long, over the ${DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH} allowed.`,
        params: { reason: "too_large" },
      });
    }
  });

/**
 * Whether a failed `DictionarySuggestionsRequestSchema` parse failed
 * because the request is too long, which is checked once the rest of it is
 * valid. A route uses it to answer with its own status, such as a 413.
 */
export function isDictionarySuggestionsRequestTooLarge(
  error: z.ZodError,
): boolean {
  return error.issues.some((issue) => {
    return issue.code === "custom" && issue.params?.reason === "too_large";
  });
}

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

const DESCRIBE_SYSTEM_PROMPT = [
  "You describe one column of a dataset, for a data dictionary, in the requested locale.",
  "Write one or two plain sentences saying what the column records, for someone who has never seen the data.",
  "If an existing description is given, it is what the dictionary's author wrote: keep its facts and wording where they are right, and improve on it rather than starting over.",
  "Use only the names, kind, values, and dataset names given. Do not invent units, codes, or facts you cannot tell from them.",
  'Reply with JSON only: {"description":"..."}',
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

const DESCRIBE_JSON_SCHEMA = {
  type: "object",
  properties: { description: { type: "string" } },
  required: ["description"],
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

const DescriptionReplySchema = z.object({
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
  if (request.task === "labels") {
    return JSON.stringify({
      task: "labels",
      locale: request.locale,
      column: _toColumnText(request.column),
    });
  }
  if (request.task === "describe") {
    return JSON.stringify({
      task: "describe",
      locale: request.locale,
      column: _toColumnText(request.column),
      datasetNames: [...request.datasetNames],
      description: request.description,
    });
  }
  return JSON.stringify({
    task: "matches",
    locale: request.locale,
    columns: request.columns.map(_toColumnText),
  });
}

/**
 * The most tokens a model may use to reply to one request, online or
 * offline. A labels reply grows with the codes it labels and their length,
 * so its budget does too, up to a cap. A description is a sentence or two,
 * and a matches reply is a short list of pairs.
 */
export function getDictionarySuggestionsMaxTokens(
  request: Readonly<DictionarySuggestionsRequest>,
): number {
  if (request.task === "describe") {
    return DESCRIBE_MAX_TOKENS;
  }
  if (request.task !== "labels") {
    return MATCHES_MAX_TOKENS;
  }
  // The reply repeats every value beside its label, so a long code costs
  // tokens as well as the entry around it.
  const valueTokens = request.column.values.reduce((total, value) => {
    return (
      total +
      LABELS_TOKENS_PER_VALUE +
      Math.ceil(value.length / DICTIONARY_SUGGESTIONS_CHARACTERS_PER_TOKEN)
    );
  }, 0);
  return Math.min(LABELS_BASE_TOKENS + valueTokens, LABELS_MAX_TOKENS);
}

/** Whether the `chat` edge function serves this suggestion prompt version. */
export function isDictionarySuggestionsPromptId(value: string): boolean {
  return (DICTIONARY_SUGGESTIONS_PROMPT_IDS as readonly string[]).includes(
    value,
  );
}

/**
 * Whether a prompt version serves a task. v1 is frozen to labels and
 * matches, so a describe request sent under it is refused.
 */
export function isDictionarySuggestionsTaskServed(
  promptId: string,
  task: DictionarySuggestionsRequest["task"],
): boolean {
  return promptId === "dictionary-suggestions-v1"
    ? task === "labels" || task === "matches"
    : isDictionarySuggestionsPromptId(promptId);
}

function _getPromptInput(
  request: Readonly<DictionarySuggestionsRequest>,
): object {
  if (request.task === "labels") {
    return { column: request.column };
  }
  if (request.task === "describe") {
    return {
      column: request.column,
      datasetNames: request.datasetNames,
      description: request.description,
    };
  }
  return { columns: request.columns };
}

function _getSystemPrompt(task: DictionarySuggestionsRequest["task"]): string {
  if (task === "labels") {
    return LABELS_SYSTEM_PROMPT;
  }
  return task === "describe" ? DESCRIBE_SYSTEM_PROMPT : MATCHES_SYSTEM_PROMPT;
}

/** The messages that ask either model for one request's suggestions. */
export function buildDictionarySuggestionsMessages(
  request: Readonly<DictionarySuggestionsRequest>,
): DictionarySuggestionsMessage[] {
  return [
    { role: "system", content: _getSystemPrompt(request.task) },
    {
      role: "user",
      content: `Locale: ${request.locale}\n${JSON.stringify(_getPromptInput(request))}`,
    },
  ];
}

/**
 * The JSON Schema a model's reply is constrained to, offline and online, so
 * a model cannot return malformed JSON.
 */
export function getDictionarySuggestionsJsonSchema(
  task: DictionarySuggestionsRequest["task"],
): object {
  if (task === "labels") {
    return LABELS_JSON_SCHEMA;
  }
  return task === "describe" ? DESCRIBE_JSON_SCHEMA : MATCHES_JSON_SCHEMA;
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
 * The labels in a model's reply, for the values that list holds only, each
 * under its spelling in `values` and labeled once, with empty labels
 * dropped and long ones cut. Undefined when the reply holds no readable
 * JSON.
 */
export function parseDictionaryLabelSuggestions(
  reply: string,
  values: readonly string[],
): DictionaryProposal.LabelSuggestions | undefined {
  const parsed = LabelsReplySchema.safeParse(_readJsonObject(reply));
  if (!parsed.success) {
    return undefined;
  }
  // Each code by the key it compares by, so a reply's `1` finds a stored
  // `01`. The label goes back under the stored spelling, once per code.
  const storedValues = new Map(
    [...values].reverse().map((value) => {
      return [ColumnProfile.getComparisonKey(value), value];
    }),
  );
  const labeledKeys = new Set<string>();
  const labels = parsed.data.labels.flatMap((item) => {
    const key = ColumnProfile.getComparisonKey(item.value);
    const value = storedValues.get(key);
    const label = item.label.trim().slice(0, MAX_LABEL_LENGTH);
    if (value === undefined || label === "" || labeledKeys.has(key)) {
      return [];
    }
    labeledKeys.add(key);
    return [{ value, label, isMissing: item.isMissing }];
  });
  const description = parsed.data.description
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH);
  return { labels, description };
}

/**
 * The description in a model's reply, trimmed and cut to the cap. Undefined
 * when the reply holds no readable JSON or the description is blank.
 */
export function parseDictionaryDescriptionSuggestion(
  reply: string,
): string | undefined {
  const parsed = DescriptionReplySchema.safeParse(_readJsonObject(reply));
  if (!parsed.success) {
    return undefined;
  }
  const description = parsed.data.description
    .trim()
    .slice(0, MAX_DESCRIPTION_LENGTH);
  return description === "" ? undefined : description;
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
