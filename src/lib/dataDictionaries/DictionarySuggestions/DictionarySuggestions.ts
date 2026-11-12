import { prop } from "@avandar/utils";
import {
  buildDictionarySuggestionsMessages,
  DICTIONARY_SUGGESTIONS_MAX_MATCH_VALUES,
  DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH,
  DICTIONARY_SUGGESTIONS_MAX_TOKENS,
  DICTIONARY_SUGGESTIONS_PROMPT_ID,
  getDictionarySuggestionsJsonSchema,
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

// The words that keep a column's values here, the codes per column of a
// matches request, and the longest request all come from the shared
// prompt module, because the `chat` route refuses a request that breaks
// them. Never define a second list here.
const MAX_OTHER_NAMES = 50;
const MAX_MATCH_COLUMNS = 300;

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
): Promise<string | undefined> {
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
  // A rephrasing suggestion would change what was agreed to, so only the
  // request as written counts as approved.
  if (!consent.approved || consent.payload.text !== text) {
    return undefined;
  }
  return await PendingAcks.consumeAckForText(text);
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
      maxTokens: DICTIONARY_SUGGESTIONS_MAX_TOKENS,
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

/** The route's rule: codes only on a coded column not named after a person. */
function _canSendValues(column: Readonly<DictionarySuggestionColumn>): boolean {
  return (
    DataDictionary.isCodedKind(column.kind) &&
    ![column.name, ...column.otherNames].some(isIdentifyingColumnName)
  );
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
    otherNames: otherNames.slice(0, MAX_OTHER_NAMES),
    kind: entry.kind,
    values,
  };
}

function makeLabelsRequestFromCodeList(
  options: Readonly<{
    proposal: DictionaryProposal.T;
    codeList: DictionaryProposal.CodeList;
    locale: string;
  }>,
): DictionarySuggestionsRequest | undefined {
  const entries = options.proposal.entries.filter((entry) => {
    return options.codeList.entryKeys.includes(entry.key);
  });
  const [first] = entries;
  const names = [
    ...new Set(entries.flatMap(DictionaryProposal.getColumnNames)),
  ];
  if (!first || names.some(isIdentifyingColumnName)) {
    return undefined;
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
          otherNames: names.slice(0, MAX_OTHER_NAMES),
        }
      : _makeColumn(first, values);
  // An entry renamed after a person keeps its codes here too.
  return _canSendValues(column)
    ? { task: "labels", locale: options.locale, column }
    : undefined;
}

function makeMatchesRequestFromProposal(
  options: Readonly<{ proposal: DictionaryProposal.T; locale: string }>,
): DictionarySuggestionsRequest | undefined {
  // A meaning match only ever joins columns of two different datasets.
  if (DictionaryProposal.getDatasetIds(options.proposal).length < 2) {
    return undefined;
  }
  const columns = options.proposal.entries
    .filter(prop("isIncluded"))
    .slice(0, MAX_MATCH_COLUMNS)
    .map((entry) => {
      const column = _makeColumn(entry, []);
      const values = _canSendValues(column)
        ? DictionaryProposal.getValuesSeen(entry)
            .slice(0, DICTIONARY_SUGGESTIONS_MAX_MATCH_VALUES)
            .map(prop("value"))
        : [];
      return { ...column, values };
    });
  return _fitMatchesRequest({
    task: "matches",
    locale: options.locale,
    columns,
  });
}

/**
 * The request with its last columns dropped until its consent text fits
 * `DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH`, which the route enforces.
 * Undefined when fewer than two columns are left.
 */
function _fitMatchesRequest(
  request: Extract<DictionarySuggestionsRequest, { task: "matches" }>,
): DictionarySuggestionsRequest | undefined {
  if (request.columns.length < 2) {
    return undefined;
  }
  const length = stringifyDictionarySuggestionsRequest(request).length;
  if (length <= DICTIONARY_SUGGESTIONS_MAX_REQUEST_LENGTH) {
    return request;
  }
  return _fitMatchesRequest({
    ...request,
    columns: request.columns.slice(0, -1),
  });
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
   * online, and returns the ack token the route checks. Undefined when the
   * user declines.
   */
  approveRequest,

  /**
   * Runs one request on the given model and returns its raw reply. Online
   * it needs the ack token `approveRequest` returned.
   */
  requestReply,

  /**
   * The request for one code list's labels. Undefined when the list's
   * columns look like they identify people, so their values stay here.
   */
  makeLabelsRequestFromCodeList,

  /**
   * The request for meaning matches across a proposal's entries. Undefined
   * when it holds fewer than two datasets, where no match could apply.
   */
  makeMatchesRequestFromProposal,
};
