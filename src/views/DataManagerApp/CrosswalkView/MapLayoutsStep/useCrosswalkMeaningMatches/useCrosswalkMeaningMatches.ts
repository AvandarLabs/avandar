import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { parseDictionaryMeaningMatches } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import {
  makeCrosswalkMatchesRequest,
  toCrosswalkMeaningMatches,
} from "@/lib/crosswalks/makeCrosswalkMatchesRequest/makeCrosswalkMatchesRequest";
import { useDictionarySuggestions } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkMatch } from "$/models/crosswalks/CrosswalkMatch/CrosswalkMatch";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type {
  CrosswalkMatchesRequest,
  CrosswalkMatchesResult,
  CrosswalkMeaningMatch,
} from "@/lib/crosswalks/makeCrosswalkMatchesRequest/makeCrosswalkMatchesRequest";
import type { DictionarySuggestionModel } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type {
  CrosswalkAction,
  CrosswalkContext,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { SuggestionConsent } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type {
  DictionarySuggestionAvailability,
  RequestSuggestionReply,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";

/**
 * Where the search for the selected layout stands. `not_sent` is a search
 * that finished without asking: the user did not let the request go.
 */
export type CrosswalkMeaningStatus = MeaningMatchStatus | "not_sent";

/** Why a layout has nothing to ask the suggestion model. */
export type CrosswalkMeaningBlockReason =
  | "nothing_to_match"
  | "too_large_for_model";

/** What step 2's Suggest matches shows and does for the selected layout. */
export type CrosswalkMeaningMatches = {
  availability: DictionarySuggestionAvailability;
  /** True when a model can answer and the layout has something to ask about. */
  canSuggest: boolean;
  /** Why there is nothing to ask, when a model could answer. */
  blockReason: CrosswalkMeaningBlockReason | undefined;
  /** The search for this layout; another layout's search reads as idle. */
  status: CrosswalkMeaningStatus;
  /** How many pairs the last search for this layout found, once it is done. */
  foundCount: number | undefined;
  suggestMatches: () => void;
};

/** The user's answer to sending column names online, and how it is given. */
export type CrosswalkSuggestionConsent = {
  consent: SuggestionConsent;
  onConsentDecided: (isApproved: boolean) => void;
};

/** What the hook reads: the draft, layout, values, consent, and dispatch. */
type MeaningMatchesOptions = Readonly<{
  draft: CrosswalkDraft.T;
  layoutId: CrosswalkLayout.Id;
  context: CrosswalkContext;
  targets: readonly CrosswalkMatch.Target[];
  profilesBySourceColumn: ReadonlyMap<string, ColumnProfile.T>;
  suggestionConsent: CrosswalkSuggestionConsent;
  dispatch: (action: CrosswalkAction) => void;
}>;

/** What a search came to: whether it asked, and the pairs it found. */
type MatchesFound = {
  wasSent: boolean;
  matches: CrosswalkMeaningMatch[];
};

type MatchesVariables = {
  request: CrosswalkMatchesRequest;
  layoutId: CrosswalkLayout.Id;
  /** The layout's profiles when it was asked about, for the dispatch. */
  sources: readonly ColumnProfile.T[];
};

/**
 * Keeps the user's answer to sending suggestions online. Step 2 holds it
 * above the shown layout, so one answer covers every layout of the
 * crosswalk while the step is open.
 */
export function useCrosswalkSuggestionConsent(): CrosswalkSuggestionConsent {
  const [consent, setConsent] = useState<SuggestionConsent>("not_asked");
  return {
    consent,
    onConsentDecided: (isApproved) => {
      setConsent(isApproved ? "approved" : "declined");
    },
  };
}

async function _requestMatches(
  request: CrosswalkMatchesRequest,
  requestReply: RequestSuggestionReply,
): Promise<MatchesFound> {
  const reply = await requestReply(request.request);
  if (reply === undefined) {
    return { wasSent: false, matches: [] };
  }
  const names = request.request.columns.map((column) => {
    return column.name;
  });
  const matches = parseDictionaryMeaningMatches(reply, names) ?? [];
  return {
    wasSent: true,
    matches: toCrosswalkMeaningMatches({ request, matches }),
  };
}

function _toStatus(result: {
  isPending: boolean;
  isError: boolean;
  isSuccess: boolean;
  data: MatchesFound | undefined;
}): CrosswalkMeaningStatus {
  if (result.isPending) {
    return "finding";
  }
  if (result.isError) {
    return "failed";
  }
  if (!result.isSuccess) {
    return "idle";
  }
  return result.data?.wasSent === false ? "not_sent" : "done";
}

/**
 * The layout's request, cut to fit the model that will answer. Only a
 * layout still being mapped is asked about: a mapped or skipped layout has
 * been settled, and the reference has nothing to map.
 */
function _makeRequest(
  options: MeaningMatchesOptions,
  locale: string,
  model: DictionarySuggestionModel,
): CrosswalkMatchesResult {
  const layout = options.draft.layouts.find((candidate) => {
    return candidate.id === options.layoutId;
  });
  if (
    !layout ||
    layout.isReference ||
    layout.status === "mapped" ||
    layout.status === "skipped"
  ) {
    return { status: "nothing_to_match" };
  }
  return makeCrosswalkMatchesRequest({
    draft: options.draft,
    layoutId: options.layoutId,
    datasetsById: options.context.datasetsById,
    targets: options.targets,
    profilesBySourceColumn: options.profilesBySourceColumn,
    locale,
    model,
  });
}

/** The search: asks, then dispatches what it found for the layout asked. */
function useFindMatches(
  options: Readonly<{
    requestReply: RequestSuggestionReply;
    context: CrosswalkContext;
    dispatch: (action: CrosswalkAction) => void;
  }>,
) {
  return useMutation({
    mutationFn: (variables: MatchesVariables) => {
      return _requestMatches(variables.request, options.requestReply);
    },
    onSuccess: (found, variables) => {
      if (found.matches.length > 0) {
        options.dispatch({
          type: "meaning_matches_found",
          layoutId: variables.layoutId,
          matches: found.matches,
          sources: variables.sources,
          context: options.context,
        });
      }
    },
    onError: () => {
      // The footer's note says the search did not finish.
    },
  });
}

/**
 * Asks the suggestion model which of a layout's unused columns mean the
 * combined dataset's unfilled columns, and dispatches the pairs as
 * `meaning_matches_found` for the layout that was asked about. Online
 * sends go through the chat's consent gate, with the answer the step keeps;
 * on device nothing is asked; with no model nothing is sent. A request the
 * user did not let go finishes as `not_sent`. A failure is shown by the
 * footer's note, not a toast: the matches by name and values are still
 * there.
 */
export function useCrosswalkMeaningMatches(
  options: MeaningMatchesOptions,
): CrosswalkMeaningMatches {
  const { i18n } = useLingui();
  const suggestions = useDictionarySuggestions(options.suggestionConsent);
  const check = _makeRequest(options, i18n.locale, suggestions.model);
  const request = check.status === "ready" ? check.request : undefined;
  const [findMatches, , result] = useFindMatches({
    requestReply: suggestions.requestReply,
    context: options.context,
    dispatch: options.dispatch,
  });
  const isThisLayout = result.variables?.layoutId === options.layoutId;
  const isModelReady =
    suggestions.availability === "online" ||
    suggestions.availability === "on_device";
  return {
    availability: suggestions.availability,
    canSuggest: isModelReady && request !== undefined,
    blockReason: check.status === "ready" ? undefined : check.status,
    status: isThisLayout ? _toStatus(result) : "idle",
    foundCount:
      isThisLayout && result.isSuccess && result.data.wasSent
        ? result.data.matches.length
        : undefined,
    suggestMatches: () => {
      if (request && isModelReady && !result.isPending) {
        findMatches({
          request,
          layoutId: options.layoutId,
          sources: [...options.profilesBySourceColumn.values()],
        });
      }
    },
  };
}
