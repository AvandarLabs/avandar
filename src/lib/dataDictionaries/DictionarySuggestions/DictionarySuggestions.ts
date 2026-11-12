import { prop } from "@avandar/utils";
import {
  buildDictionarySuggestionsMessages,
  DICTIONARY_SUGGESTIONS_CHARACTERS_PER_TOKEN,
  DICTIONARY_SUGGESTIONS_MAX_MATCH_COLUMNS,
  DICTIONARY_SUGGESTIONS_MAX_MATCH_VALUES,
  DICTIONARY_SUGGESTIONS_MAX_OTHER_NAMES,
  DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH,
  DICTIONARY_SUGGESTIONS_MAX_VALUE_LENGTH,
  DICTIONARY_SUGGESTIONS_PROMPT_ID,
  getDictionarySuggestionsJsonSchema,
  getDictionarySuggestionsMaxTokens,
  isIdentifyingColumnName,
  stringifyDictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { LocalChatModel } from "$/models/chat/LocalChatModel/LocalChatModel";
import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { resolveChatRuntimeMode } from "@/components/ChatPanel/useAvandarChatRuntime/resolveChatRuntimeMode/resolveChatRuntimeMode";
import { decideIfDataCanCrossBoundary } from "@/components/privacy/privacy-helpers/decideIfDataCanCrossBoundary";
import { PendingAcks } from "@/components/privacy/privacy-helpers/PendingAcks";
import { OFFLINE_CHAT_CONTEXT_WINDOW_SIZE } from "@/stores/OfflineChatEngineStore/createLocalModelRuntime/offlineChatContextWindow";
import type {
  DictionarySuggestionColumn,
  DictionarySuggestionsMessage,
  DictionarySuggestionsRequest,
} from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import type { Workspace } from "$/models/Workspace/Workspace";

/**
 * Where dictionary suggestions run: the hosted model, the offline model on
 * this device, or nowhere (offline without the offline models).
 */
export type DictionarySuggestionModel = "online" | "on_device" | "unavailable";

/**
 * Why a code list's values cannot be sent for label suggestions: its columns
 * name people, a code is longer than a request may carry, or the list is too
 * long for the offline model's context window.
 */
export type LabelsBlockReason =
  | "personal"
  | "code_too_long"
  | "too_large_for_model";

/** Posts one request to the online suggestions route. */
export type PostDictionarySuggestions = (options: {
  route: "chat/:workspaceId/dictionary-suggestions/:promptId";
  pathParams: {
    workspaceId: string;
    promptId: typeof DICTIONARY_SUGGESTIONS_PROMPT_ID;
  };
  body: { request: DictionarySuggestionsRequest; ackToken: string };
}) => Promise<{ reply: string }>;

/** Runs one completion on the offline model. */
export type CompleteDictionarySuggestionsOnDevice = (request: {
  modelId: LocalChatModel.Id;
  messages: DictionarySuggestionsMessage[];
  maxTokens: number;
  temperature: number;
  jsonSchema: object;
}) => Promise<{ text: string }>;

/**
 * What the user's consent to send one request came to: an ack token the
 * route checks, a real no, or a yes that left no token to send with (a
 * technical failure, not a decision).
 */
export type DictionarySuggestionsApproval =
  | { type: "approved"; ackToken: string }
  | { type: "declined" }
  | { type: "ack_missing" };

// The words that keep a column's values here, and every cap on a request
// (codes, code length, other names, columns, total length), come from the
// shared prompt module, because the `chat` route refuses a request that
// breaks them. Never define a second list here.

function getModelFromRuntimeState(
  options: Readonly<{
    navigatorOnLine: boolean;
    isOfflineModeOn: boolean;
    isBundleDownloaded: boolean;
  }>,
): DictionarySuggestionModel {
  if (resolveChatRuntimeMode(options).kind === "local") {
    return "on_device";
  }
  return options.navigatorOnLine ? "online" : "unavailable";
}

async function approveRequest(
  options: Readonly<{
    request: DictionarySuggestionsRequest;
    workspaceId: Workspace.Id;
    userId: string;
    /** True once the user agreed to an earlier send in this flow. */
    isConsentConfirmed: boolean;
  }>,
): Promise<DictionarySuggestionsApproval> {
  const { request } = options;
  const text = stringifyDictionarySuggestionsRequest(request);
  const columns =
    request.task === "labels" ? [request.column] : request.columns;
  const consent = await decideIfDataCanCrossBoundary({
    text,
    values: columns.flatMap((column) => {
      return column.values;
    }),
    sourceColumn: request.task === "labels" ? request.column.name : undefined,
    context: "dictionary_suggestions",
    workspaceId: options.workspaceId,
    userId: options.userId,
    // The first send in a flow always asks, even when nothing looks personal.
    explicitConsentRequired: !options.isConsentConfirmed,
  });
  if (!consent.approved) {
    return { type: "declined" };
  }
  // Picking "Use suggestion" on a bias nudge rewrites the text, which would
  // change what was agreed to. Only the request as written counts as
  // approved, so a rewrite is a decline. Its ack is minted for the rewritten
  // text, so it is dropped here rather than left in the queue.
  if (consent.payload.text !== text) {
    if (consent.payload.text !== undefined) {
      await PendingAcks.consumeAckForText(consent.payload.text);
    }
    return { type: "declined" };
  }
  const ackToken = await PendingAcks.consumeAckForText(text);
  return ackToken === undefined
    ? { type: "ack_missing" }
    : { type: "approved", ackToken };
}

async function requestReply(
  options: Readonly<
    {
      workspaceId: string;
      request: DictionarySuggestionsRequest;
      post: PostDictionarySuggestions;
      completeOnDevice: CompleteDictionarySuggestionsOnDevice;
    } & ({ model: "on_device" } | { model: "online"; ackToken: string })
  >,
): Promise<string> {
  if (options.model === "on_device") {
    const completion = await options.completeOnDevice({
      modelId: LocalChatModel.OFFLINE_BUNDLE.answer,
      messages: buildDictionarySuggestionsMessages(options.request),
      maxTokens: getDictionarySuggestionsMaxTokens(options.request),
      temperature: 0,
      jsonSchema: getDictionarySuggestionsJsonSchema(options.request.task),
    });
    return completion.text;
  }
  const response = await options.post({
    route: "chat/:workspaceId/dictionary-suggestions/:promptId",
    pathParams: {
      workspaceId: options.workspaceId,
      promptId: DICTIONARY_SUGGESTIONS_PROMPT_ID,
    },
    body: { request: options.request, ackToken: options.ackToken },
  });
  return response.reply;
}

/**
 * The route's rule: codes only on a coded column not named after a person.
 * `allNames` is every name the column goes by, before any are cut to fit
 * the request, so an identifying name past the cap still blocks its codes.
 */
function _canSendValues(
  kind: DictionarySuggestionColumn["kind"],
  allNames: readonly string[],
): boolean {
  return (
    DataDictionary.isCodedKind(kind) && !allNames.some(isIdentifyingColumnName)
  );
}

/** Whether every code fits the schema's length limit, uncut. */
function _areValuesShortEnough(values: readonly string[]): boolean {
  return values.every((value) => {
    return value.length <= DICTIONARY_SUGGESTIONS_MAX_VALUE_LENGTH;
  });
}

function _makeColumn(
  entry: Readonly<DictionaryProposal.Entry>,
  values: string[],
): DictionarySuggestionColumn {
  const otherNames = DictionaryProposal.getColumnNames(entry).filter((name) => {
    return name !== entry.name;
  });
  return {
    name: entry.name,
    otherNames: otherNames.slice(0, DICTIONARY_SUGGESTIONS_MAX_OTHER_NAMES),
    kind: entry.kind,
    values,
  };
}

type LabelsRequestOptions = Readonly<{
  proposal: DictionaryProposal.T;
  codeList: DictionaryProposal.CodeList;
  locale: string;
  model: DictionarySuggestionModel;
}>;

type LabelsRequestCheck =
  | { type: "ready"; request: DictionarySuggestionsRequest }
  | { type: "blocked"; reason: LabelsBlockReason };

function _checkLabelsRequestFromCodeList(
  options: LabelsRequestOptions,
): LabelsRequestCheck {
  const entries = options.proposal.entries.filter((entry) => {
    return options.codeList.entryKeys.includes(entry.key);
  });
  const [first] = entries;
  const names = [
    ...new Set(entries.flatMap(DictionaryProposal.getColumnNames)),
  ];
  // A list with no entries has no column to vouch for its values, so they
  // are kept back like a person's.
  if (!first || names.some(isIdentifyingColumnName)) {
    return { type: "blocked", reason: "personal" };
  }
  const values = options.codeList.values
    .map(prop("value"))
    .slice(0, ColumnProfile.MAX_LISTED_VALUES);
  // A shared list is labeled once for every entry that uses it.
  const column =
    entries.length > 1
      ? {
          ..._makeColumn(first, values),
          name: options.codeList.name,
          otherNames: names.slice(0, DICTIONARY_SUGGESTIONS_MAX_OTHER_NAMES),
        }
      : _makeColumn(first, values);
  // An entry renamed after a person keeps its codes here too. Codes are
  // never cut, since a cut code could not be matched to its label, so a
  // list with a code over the limit asks for nothing.
  const request: DictionarySuggestionsRequest = {
    task: "labels",
    locale: options.locale,
    column,
  };
  if (!_canSendValues(column.kind, [column.name, ...names])) {
    return { type: "blocked", reason: "personal" };
  }
  if (!_areValuesShortEnough(values)) {
    return { type: "blocked", reason: "code_too_long" };
  }
  return _fitsModel(request, options.model)
    ? { type: "ready", request }
    : { type: "blocked", reason: "too_large_for_model" };
}

function makeLabelsRequestFromCodeList(
  options: LabelsRequestOptions,
): DictionarySuggestionsRequest | undefined {
  const check = _checkLabelsRequestFromCodeList(options);
  return check.type === "ready" ? check.request : undefined;
}

function getLabelsBlockReason(
  options: LabelsRequestOptions,
): LabelsBlockReason | undefined {
  const check = _checkLabelsRequestFromCodeList(options);
  return check.type === "blocked" ? check.reason : undefined;
}

function makeMatchesRequestFromProposal(
  options: Readonly<{
    proposal: DictionaryProposal.T;
    locale: string;
    model: DictionarySuggestionModel;
  }>,
): DictionarySuggestionsRequest | undefined {
  // A meaning match only ever joins columns of two different datasets.
  if (DictionaryProposal.getDatasetIds(options.proposal).length < 2) {
    return undefined;
  }
  const columns = options.proposal.entries
    .filter(prop("isIncluded"))
    .slice(0, DICTIONARY_SUGGESTIONS_MAX_MATCH_COLUMNS)
    .map((entry) => {
      const column = _makeColumn(entry, []);
      const allNames = [
        entry.name,
        ...DictionaryProposal.getColumnNames(entry),
      ];
      const values = DictionaryProposal.getValuesSeen(entry)
        .slice(0, DICTIONARY_SUGGESTIONS_MAX_MATCH_VALUES)
        .map(prop("value"));
      // A column with a code over the limit sends none, never a cut one.
      return {
        ...column,
        values:
          _canSendValues(column.kind, allNames) && _areValuesShortEnough(values)
            ? values
            : [],
      };
    });
  return _fitMatchesRequest(
    { task: "matches", locale: options.locale, columns },
    options.model,
  );
}

/**
 * Whether one request fits where it will run: the route's cap on the consent
 * text online, or the offline model's context window on device. The window
 * has to hold the prompt, the request, and the reply, so the prompt and the
 * request are sized at the shared pessimistic characters-per-token estimate
 * and the reply at its budget.
 */
function _fitsModel(
  request: Readonly<DictionarySuggestionsRequest>,
  model: DictionarySuggestionModel,
): boolean {
  if (model !== "on_device") {
    return (
      stringifyDictionarySuggestionsRequest(request).length <=
      DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH
    );
  }
  const characters = buildDictionarySuggestionsMessages(request).reduce(
    (total, message) => {
      return total + message.content.length;
    },
    0,
  );
  return (
    Math.ceil(characters / DICTIONARY_SUGGESTIONS_CHARACTERS_PER_TOKEN) +
      getDictionarySuggestionsMaxTokens(request) <=
    OFFLINE_CHAT_CONTEXT_WINDOW_SIZE
  );
}

/** The matches request with no column carrying more than `limit` codes. */
function _capMatchValues(
  request: Extract<DictionarySuggestionsRequest, { task: "matches" }>,
  limit: number,
): Extract<DictionarySuggestionsRequest, { task: "matches" }> {
  return {
    ...request,
    columns: request.columns.map((column) => {
      return { ...column, values: column.values.slice(0, limit) };
    }),
  };
}

/**
 * The request cut down until it fits its model. On device, codes go first,
 * one fewer per column at a time, since the columns' names carry the match,
 * and then columns. Online, only the last columns are dropped. Undefined
 * when fewer than two columns are left.
 */
function _fitMatchesRequest(
  request: Extract<DictionarySuggestionsRequest, { task: "matches" }>,
  model: DictionarySuggestionModel,
): DictionarySuggestionsRequest | undefined {
  if (request.columns.length < 2) {
    return undefined;
  }
  if (_fitsModel(request, model)) {
    return request;
  }
  const mostValues = Math.max(
    ...request.columns.map((column) => {
      return column.values.length;
    }),
  );
  if (model === "on_device" && mostValues > 0) {
    return _fitMatchesRequest(_capMatchValues(request, mostValues - 1), model);
  }
  return _fitMatchesRequest(
    { ...request, columns: request.columns.slice(0, -1) },
    model,
  );
}

/**
 * AI suggestions for a dictionary being learned from datasets, online and
 * offline alike. Only column names, kinds, and the codes of short coded
 * columns are sent, never rows, and never the values of a column named
 * after a person or a contact detail. Online sends go through the chat's
 * consent gate first. Used by the create flow's Review and Label values
 * steps.
 */
export const DictionarySuggestions = {
  /** Which model answers, the same way chat decides where a turn runs. */
  getModelFromRuntimeState,

  /**
   * Asks the user, through the chat's consent gate, to send one request
   * online, and returns the ack token the route checks. A decline, or an
   * edit that changes what was agreed to, is `declined`. A yes that left no
   * token is `ack_missing`, which is a failure to retry, not a no.
   */
  approveRequest,

  /**
   * Runs one request on the given model and returns its raw reply. Online
   * it needs the ack token `approveRequest` returned.
   */
  requestReply,

  /**
   * The request for one code list's labels. Undefined when the list's
   * columns look like they identify people, so their values stay here, or
   * when it cannot fit where it will run: codes are never cut, so on device
   * a long list asks for nothing.
   */
  makeLabelsRequestFromCodeList,

  /**
   * Why a code list's labels cannot be asked for, or undefined when they
   * can. Lets the Label values step say which of the three it is.
   */
  getLabelsBlockReason,

  /**
   * The request for meaning matches across a proposal's entries. Undefined
   * when it holds fewer than two datasets, where no match could apply.
   * Cut to fit the model that will answer, codes first on device.
   */
  makeMatchesRequestFromProposal,
};
