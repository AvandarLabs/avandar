import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { parseDictionaryLabelSuggestions } from "$/agent/dictionarySuggestions/dictionarySuggestionsPrompt";
import { DictionarySuggestions } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type {
  DictionarySuggestionModel,
  LabelsBlockReason,
} from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type {
  NewDictionaryAction,
  ProposalReadId,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
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

type SuggestOptions = Readonly<{
  proposal: DictionaryProposal.T | undefined;
  /** The proposal's read. Labels for another read are dropped. */
  readId: ProposalReadId | undefined;
  model: DictionarySuggestionModel;
  requestReply: RequestSuggestionReply;
  dispatch: Dispatch<NewDictionaryAction>;
}>;

/** What the Label values step can do about suggesting labels. */
export type SuggestLabels = {
  suggestLabels: (codeList: DictionaryProposal.CodeList) => void;
  /**
   * Why a request cannot be made for this list, or undefined when it can:
   * a column of the list looks like it identifies people, a code is too long
   * to send, or the list is too long for the model that would answer.
   */
  getLabelsBlockReason: (
    codeList: DictionaryProposal.CodeList,
  ) => LabelsBlockReason | undefined;
  suggestingCodeListKey: string | undefined;
};

/** One request: the list to label, and the read it was asked for. */
type SuggestRequest = {
  codeList: DictionaryProposal.CodeList;
  readId: ProposalReadId | undefined;
};

function _getLabelsBlockReason(
  options: Readonly<{
    proposal: DictionaryProposal.T | undefined;
    codeList: DictionaryProposal.CodeList;
    locale: string;
    model: DictionarySuggestionModel;
  }>,
): LabelsBlockReason | undefined {
  // Without a proposal there is no list to label, so nothing to block.
  return options.proposal
    ? DictionarySuggestions.getLabelsBlockReason({
        proposal: options.proposal,
        codeList: options.codeList,
        locale: options.locale,
        model: options.model,
      })
    : undefined;
}

/**
 * Asks the suggestion model for one code list's labels and a description
 * for the entry using it, and fills them in as suggestions. Used by the
 * Label values step's Suggest labels button. When the user declines to
 * send the request, nothing is filled in and nothing is shown: the Label
 * values pane already says suggestions are off. `getLabelsBlockReason`
 * lets that step explain why the button is off for a list that cannot be
 * sent, instead of a failed request.
 */
export function useSuggestLabels(options: SuggestOptions): SuggestLabels {
  const { t, i18n } = useLingui();
  const isMountedRef = useIsMounted();
  const [suggest, , result] = useMutation({
    mutationFn: (request: SuggestRequest) => {
      return _requestLabelSuggestions({
        proposal: options.proposal,
        codeList: request.codeList,
        locale: i18n.locale,
        model: options.model,
        requestReply: options.requestReply,
      });
    },
    onSuccess: (suggestions, { codeList, readId }) => {
      if (!suggestions) {
        return;
      }
      const isSingleEntry = codeList.entryKeys.length === 1;
      options.dispatch({
        type: "labels_suggested",
        codeListKey: codeList.key,
        entryKey: isSingleEntry ? codeList.entryKeys[0] : undefined,
        readId,
        suggestions,
      });
      if (isMountedRef.current) {
        notifySuccess(t`Suggested labels filled in. Check them before saving.`);
      }
    },
    onError: () => {
      if (isMountedRef.current) {
        notifyError(
          t`Suggestions did not come back. Labeling still works without them.`,
        );
      }
    },
  });
  return {
    suggestLabels: (codeList) => {
      suggest({ codeList, readId: options.readId });
    },
    getLabelsBlockReason: (codeList) => {
      return _getLabelsBlockReason({
        proposal: options.proposal,
        codeList,
        locale: i18n.locale,
        model: options.model,
      });
    },
    suggestingCodeListKey: result.isPending
      ? result.variables?.codeList.key
      : undefined,
  };
}
