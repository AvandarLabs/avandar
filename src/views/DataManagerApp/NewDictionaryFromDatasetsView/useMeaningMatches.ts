import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { parseDictionaryMeaningMatches } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { DictionarySuggestionModel } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { ProposalReadId } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { RequestSuggestionReply } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";

/** Where the search for columns that mean the same thing stands. */
export type MeaningMatchStatus = "idle" | "finding" | "done" | "failed";

type MatchesVariables = {
  proposal: DictionaryProposal.T;
  readId: ProposalReadId;
};

async function _requestMatches(
  options: Readonly<{
    proposal: DictionaryProposal.T;
    locale: string;
    model: DictionarySuggestionModel;
    requestReply: RequestSuggestionReply;
  }>,
): Promise<DictionaryProposal.MeaningMatch[]> {
  const request = DictionarySuggestions.makeMatchesRequestFromProposal({
    proposal: options.proposal,
    locale: options.locale,
    model: options.model,
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
 * record the same thing, and hands back the matches with the proposal
 * and read they were found for. A failure is shown by
 * the Review step's status line, not a toast: the matches by name and
 * values are still there. A request the user declined to send finds none.
 */
export function useMeaningMatches(
  options: Readonly<{
    requestReply: RequestSuggestionReply;
    model: DictionarySuggestionModel;
    onFound: (
      matches: DictionaryProposal.MeaningMatch[],
      proposal: DictionaryProposal.T,
      readId: ProposalReadId,
    ) => void;
  }>,
): {
  findMatches: (proposal: DictionaryProposal.T, readId: ProposalReadId) => void;
  status: MeaningMatchStatus;
} {
  const { i18n } = useLingui();
  const [findMatchesFor, , result] = useMutation({
    mutationFn: (variables: MatchesVariables) => {
      return _requestMatches({
        proposal: variables.proposal,
        locale: i18n.locale,
        model: options.model,
        requestReply: options.requestReply,
      });
    },
    onSuccess: (matches, variables) => {
      if (matches.length > 0) {
        options.onFound(matches, variables.proposal, variables.readId);
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
  return {
    findMatches: (proposal, readId) => {
      findMatchesFor({ proposal, readId });
    },
    status,
  };
}
