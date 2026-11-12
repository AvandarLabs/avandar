import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { parseDictionaryLabelSuggestions } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { DictionarySuggestionModel } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type { NewDictionaryAction } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { RequestSuggestionReply } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { Dispatch } from "react";

async function _requestLabelSuggestions(
  options: Readonly<{
    proposal: DictionaryProposal.T | undefined;
    codeList: DictionaryProposal.CodeList;
    locale: string;
    model: DictionarySuggestionModel;
    requestReply: RequestSuggestionReply;
  }>,
): Promise<DictionaryProposal.LabelSuggestions | undefined> {
  const request = options.proposal
    ? DictionarySuggestions.makeLabelsRequestFromCodeList({
        proposal: options.proposal,
        codeList: options.codeList,
        locale: options.locale,
        model: options.model,
      })
    : undefined;
  if (request?.task !== "labels") {
    throw new Error("This code list's values cannot be sent");
  }
  const reply = await options.requestReply(request);
  if (reply === undefined) {
    return undefined;
  }
  const suggestions = parseDictionaryLabelSuggestions(
    reply,
    request.column.values,
  );
  if (!suggestions) {
    throw new Error("The suggestion reply could not be read");
  }
  return suggestions;
}

/**
 * Asks the suggestion model for one code list's labels and a description
 * for the entry using it, and fills them in as suggestions. Used by the
 * Label values step's Suggest labels button. When the user declines to
 * send the request, nothing is filled in and nothing is shown: the Label
 * values pane already says suggestions are off. `canSuggestLabels` lets
 * that step hide or explain the button for a list that cannot be sent,
 * instead of a failed request.
 */
export function useSuggestLabels(
  options: Readonly<{
    proposal: DictionaryProposal.T | undefined;
    model: DictionarySuggestionModel;
    requestReply: RequestSuggestionReply;
    dispatch: Dispatch<NewDictionaryAction>;
  }>,
): {
  suggestLabels: (codeList: DictionaryProposal.CodeList) => void;
  /**
   * Whether a request can be made for this list at all. It cannot when a
   * column of the list looks like it identifies people, when a code is too
   * long to send, or when the list is too long for the offline model.
   */
  canSuggestLabels: (codeList: DictionaryProposal.CodeList) => boolean;
  suggestingCodeListKey: string | undefined;
} {
  const { t, i18n } = useLingui();
  const [suggestLabels, , result] = useMutation({
    mutationFn: (codeList: DictionaryProposal.CodeList) => {
      return _requestLabelSuggestions({
        proposal: options.proposal,
        codeList,
        locale: i18n.locale,
        model: options.model,
        requestReply: options.requestReply,
      });
    },
    onSuccess: (suggestions, codeList) => {
      if (!suggestions) {
        return;
      }
      const isSingleEntry = codeList.entryKeys.length === 1;
      options.dispatch({
        type: "labels_suggested",
        codeListKey: codeList.key,
        entryKey: isSingleEntry ? codeList.entryKeys[0] : undefined,
        suggestions,
      });
      notifySuccess(t`Suggested labels filled in. Check them before saving.`);
    },
    onError: () => {
      notifyError(
        t`Suggestions did not come back. Labeling still works without them.`,
      );
    },
  });
  return {
    suggestLabels,
    canSuggestLabels: (codeList) => {
      return (
        options.proposal !== undefined &&
        DictionarySuggestions.makeLabelsRequestFromCodeList({
          proposal: options.proposal,
          codeList,
          locale: i18n.locale,
          model: options.model,
        }) !== undefined
      );
    },
    suggestingCodeListKey: result.isPending ? result.variables?.key : undefined,
  };
}
