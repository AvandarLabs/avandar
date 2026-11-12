import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef } from "react";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useCreateDictionary } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary";
import { useDictionarySuggestions } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import { useMeaningMatches } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import { useReadDatasets } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useReadDatasets";
import { useSuggestLabels } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useSuggestLabels";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserProfile } from "$/models/User/UserProfile";
import type {
  NewDictionaryAction,
  NewDictionaryState,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { CreateDictionaryVariables } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import type { NewDictionarySources } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionarySources";
import type { ReadableDataset } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useReadDatasets";
import type { Dispatch } from "react";

/** What the create flow's steps can do beyond changing its state. */
export type NewDictionaryFlow = {
  suggestionAvailability: DictionarySuggestionAvailability;
  readPickedDatasets: () => void;
  isReading: boolean;
  meaningMatchStatus: MeaningMatchStatus;
  suggestLabels: (codeList: DictionaryProposal.CodeList) => void;
  suggestingCodeListKey: string | undefined;
  createDictionary: () => void;
  isCreating: boolean;
};

type FlowOptions = {
  state: NewDictionaryState;
  dispatch: Dispatch<NewDictionaryAction>;
  sources: NewDictionarySources;
};

function _getReadableDatasets(
  sources: Readonly<NewDictionarySources>,
  datasetIds: readonly Dataset.Id[],
): ReadableDataset[] {
  return datasetIds.flatMap((datasetId) => {
    const dataset = sources.datasets.find((current) => {
      return current.id === datasetId;
    });
    const columns = sources.columnsByDatasetId.get(datasetId) ?? [];
    return dataset ? [{ dataset, columns }] : [];
  });
}

function _makeCreateDictionary(
  options: Readonly<{
    state: NewDictionaryState;
    userProfile: UserProfile.T | undefined;
    create: (variables: CreateDictionaryVariables) => void;
  }>,
): () => void {
  const { state, userProfile, create } = options;
  return () => {
    if (!userProfile || !state.proposal) {
      return;
    }
    create({
      owner: userProfile,
      name: state.name.trim(),
      description: state.description.trim(),
      datasetIds: DictionaryProposal.getDatasetIds(state.proposal),
      draft: DictionaryProposal.toDraft({
        proposal: state.proposal,
        labels: state.labels,
      }),
    });
  };
}

/**
 * Reads datasets and, once they are read, asks the suggestion model which
 * of their columns mean the same thing. Online, the first such request opens
 * the consent prompt; after a no it is not sent.
 */
function useReadWithMatches(
  options: Readonly<
    FlowOptions & { suggestions: ReturnType<typeof useDictionarySuggestions> }
  >,
): {
  read: (datasets: readonly ReadableDataset[]) => void;
  isReading: boolean;
  meaningMatchStatus: MeaningMatchStatus;
} {
  const { state, dispatch, sources, suggestions } = options;
  const { t } = useLingui();
  const matches = useMeaningMatches({
    requestReply: suggestions.requestReply,
    onFound: (found) => {
      dispatch({ type: "meaning_matches_found", matches: found });
    },
  });
  const [read, isReading] = useReadDatasets({
    onRead: (proposal) => {
      const firstName =
        sources.datasets.find((dataset) => {
          return dataset.id === state.pickedDatasetIds[0];
        })?.name ?? "";
      const defaultName = t`${firstName} codes`;
      dispatch({ type: "datasets_read", proposal, defaultName });
      const { availability } = suggestions;
      if (availability === "online" || availability === "on_device") {
        matches.findMatches(proposal);
      }
    },
  });
  return { read, isReading, meaningMatchStatus: matches.status };
}

/** Reads the dataset whose menu opened the flow, once its columns load. */
function useReadOriginDataset(
  options: Readonly<{
    state: NewDictionaryState;
    sources: NewDictionarySources;
    read: (datasets: readonly ReadableDataset[]) => void;
  }>,
): void {
  const { state, sources, read } = options;
  const hasStarted = useRef(false);
  const { originDatasetId, proposal } = state;
  useEffect(() => {
    if (
      hasStarted.current ||
      !originDatasetId ||
      proposal ||
      sources.isLoading
    ) {
      return;
    }
    hasStarted.current = true;
    read(_getReadableDatasets(sources, [originDatasetId]));
  }, [originDatasetId, proposal, sources, read]);
}

/**
 * Connects the create flow's state to everything outside it: reading the
 * picked datasets, meaning matches, label suggestions, and saving.
 * `NewDictionaryFromDatasetsView` calls it once and hands the result to its
 * steps.
 */
export function useNewDictionaryFlow(
  options: Readonly<FlowOptions>,
): NewDictionaryFlow {
  const { state, dispatch, sources } = options;
  const [userProfile] = useCurrentUserProfile();
  const suggestions = useDictionarySuggestions({
    consent: state.suggestionConsent,
    onConsentDecided: (isApproved) => {
      dispatch({ type: "suggestion_consent_decided", isApproved });
    },
  });
  const reading = useReadWithMatches({ state, dispatch, sources, suggestions });
  useReadOriginDataset({ state, sources, read: reading.read });
  const labels = useSuggestLabels({
    proposal: state.proposal,
    requestReply: suggestions.requestReply,
    dispatch,
  });
  const [create, isCreating] = useCreateDictionary();
  return {
    suggestionAvailability: suggestions.availability,
    readPickedDatasets: () => {
      reading.read(_getReadableDatasets(sources, state.pickedDatasetIds));
    },
    isReading: reading.isReading,
    meaningMatchStatus: reading.meaningMatchStatus,
    suggestLabels: labels.suggestLabels,
    suggestingCodeListKey: labels.suggestingCodeListKey,
    createDictionary: _makeCreateDictionary({ state, userProfile, create }),
    isCreating,
  };
}
