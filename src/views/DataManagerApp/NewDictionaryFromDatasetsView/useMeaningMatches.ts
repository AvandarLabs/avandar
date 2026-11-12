import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { parseDictionaryMeaningMatches } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { RequestSuggestionReply } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";

/** Where the search for columns that mean the same thing stands. */
export type MeaningMatchStatus = "idle" | "finding" | "done" | "failed";

async function _requestMatches(
  options: Readonly<{
    proposal: DictionaryProposal.T;
    locale: string;
    requestReply: RequestSuggestionReply;
  }>,
): Promise<DictionaryProposal.MeaningMatch[]> {
  const request = DictionarySuggestions.makeMatchesRequestFromProposal({
    proposal: options.proposal,
    locale: options.locale,
  });
  if (request?.task !== "matches") {
    return [];
  }
  const names = request.columns.map((column) => {
    return column.name;
  });
  const reply = await options.requestReply(request);
  if (reply === undefined) {
    return [];
  }
  return parseDictionaryMeaningMatches(reply, names) ?? [];
}

/**
 * Asks the suggestion model, once, which columns of different datasets
 * record the same thing, and hands back the matches. A failure is shown by
 * the Review step's status line, not a toast: the matches by name and
 * values are still there. A request the user declined to send finds none.
 */
export function useMeaningMatches(
  options: Readonly<{
    requestReply: RequestSuggestionReply;
    onFound: (matches: DictionaryProposal.MeaningMatch[]) => void;
  }>,
): {
  findMatches: (proposal: DictionaryProposal.T) => void;
  status: MeaningMatchStatus;
} {
  const { i18n } = useLingui();
  const [findMatches, , result] = useMutation({
    mutationFn: (proposal: DictionaryProposal.T) => {
      return _requestMatches({
        proposal,
        locale: i18n.locale,
        requestReply: options.requestReply,
      });
    },
    onSuccess: (matches) => {
      if (matches.length > 0) {
        options.onFound(matches);
      }
    },
    onError: () => {
      // The Review step's status line says the search did not finish.
    },
  });
  const status: MeaningMatchStatus = result.isPending
    ? "finding"
    : result.isError
      ? "failed"
      : result.isSuccess
        ? "done"
        : "idle";
  return { findMatches, status };
}
