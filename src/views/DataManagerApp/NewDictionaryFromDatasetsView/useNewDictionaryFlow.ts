import { useLingui } from "@lingui/react/macro";
import { useEffect, useRef } from "react";
import { uuid } from "$/lib/uuid";
import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import { useCurrentUserProfile } from "@/hooks/users/useCurrentUserProfile";
import { useIsMounted } from "@/lib/hooks/state/useIsMounted";
import { notifyError } from "@/utils/notifications/notify";
import { isSameDatasetSet } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import { useCreateDictionary } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary";
import { useDictionarySuggestions } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import { useMeaningMatches } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import { useReadDatasets } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useReadDatasets";
import { useSuggestLabels } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useSuggestLabels";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { UserProfile } from "$/models/User/UserProfile";
import type { LabelsBlockReason } from "@/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions";
import type {
  NewDictionaryAction,
  NewDictionaryState,
  ProposalReadId,
} from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/newDictionaryReducer/newDictionaryReducer";
import type { CreateDictionaryVariables } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useCreateDictionary";
import type { DictionarySuggestionAvailability } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useDictionarySuggestions/useDictionarySuggestions";
import type { MeaningMatchStatus } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useMeaningMatches";
import type { NewDictionarySources } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useNewDictionarySources";
import type { ApplyTarget } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useOpenAfterCreate";
import type { ReadableDataset } from "@/views/DataManagerApp/NewDictionaryFromDatasetsView/useReadDatasets";
import type { Dispatch, RefObject } from "react";

/** What the create flow's steps can do beyond changing its state. */
export type NewDictionaryFlow = {
  suggestionAvailability: DictionarySuggestionAvailability;
  readPickedDatasets: () => void;
  isReading: boolean;
  meaningMatchStatus: MeaningMatchStatus;
  suggestLabels: (codeList: DictionaryProposal.CodeList) => void;
  getLabelsBlockReason: (
    codeList: DictionaryProposal.CodeList,
  ) => LabelsBlockReason | undefined;
  suggestingCodeListKey: string | undefined;
  createDictionary: () => void;
  isCreating: boolean;
  /**
   * The datasets the dictionary is learned from, the one that opened the
   * flow or else the first picked first. Saving can go on to apply it.
   */
  applyTargets: readonly ApplyTarget[];
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

/** The read datasets: the one that opened the flow, or the picked ones. */
function _getApplyTargets(
  state: NewDictionaryState,
  sources: Readonly<NewDictionarySources>,
): ApplyTarget[] {
  if (!state.proposal) {
    return [];
  }
  const readIds = DictionaryProposal.getDatasetIds(state.proposal);
  const orderedIds = state.originDatasetId
    ? [state.originDatasetId]
    : state.pickedDatasetIds;
  return orderedIds.flatMap((datasetId) => {
    const dataset = sources.datasets.find((current) => {
      return current.id === datasetId;
    });
    return dataset && readIds.includes(datasetId)
      ? [{ datasetId, name: dataset.name }]
      : [];
  });
}

function _makeCreateDictionary(
  options: Readonly<{
    state: NewDictionaryState;
    userProfile: UserProfile.T | undefined;
    applyTargets: readonly ApplyTarget[];
    create: (variables: CreateDictionaryVariables) => void;
    isCreatingRef: RefObject<boolean>;
  }>,
): () => void {
  const { state, userProfile, create, isCreatingRef } = options;
  return () => {
    // A second press before the first save re-renders the button is ignored.
    if (!userProfile || !state.proposal || isCreatingRef.current) {
      return;
    }
    isCreatingRef.current = true;
    create({
      owner: userProfile,
      name: state.name.trim(),
      description: state.description.trim(),
      datasetIds: DictionaryProposal.getDatasetIds(state.proposal),
      draft: DictionaryProposal.toDraft({
        proposal: state.proposal,
        labels: state.labels,
      }),
      applyNext: state.appliesNext ? options.applyTargets : [],
    });
  };
}

type ReadOptions = Readonly<
  FlowOptions & { suggestions: ReturnType<typeof useDictionarySuggestions> }
>;

/**
 * Dispatches a finished read and, when the suggestion model is available,
 * asks it for meaning matches. A read that finishes after the user left the
 * flow, or for datasets that are no longer the picked ones, does nothing.
 */
function _dispatchReadAndFindMatches(
  options: Readonly<
    ReadOptions & {
      proposal: DictionaryProposal.T;
      datasets: readonly ReadableDataset[];
      isCurrent: boolean;
      defaultName: string;
      findMatches: (
        proposal: DictionaryProposal.T,
        readId: ProposalReadId,
      ) => void;
    }
  >,
): void {
  const { dispatch, suggestions, proposal, datasets } = options;
  if (!options.isCurrent) {
    return;
  }
  const readId = uuid<ProposalReadId>();
  dispatch({
    type: "datasets_read",
    proposal,
    datasetIds: datasets.map(({ dataset }) => {
      return dataset.id;
    }),
    readId,
    defaultName: options.defaultName,
  });
  const { availability } = suggestions;
  if (availability === "online" || availability === "on_device") {
    options.findMatches(proposal, readId);
  }
}

/**
 * Reads datasets and, once they are read, asks the suggestion model which
 * of their columns mean the same thing. Online, the first such request opens
 * the consent prompt; after a no it is not sent.
 */
function useReadWithMatches(options: ReadOptions): {
  read: (datasets: readonly ReadableDataset[]) => void;
  isReading: boolean;
  meaningMatchStatus: MeaningMatchStatus;
} {
  const { state, dispatch, suggestions } = options;
  const { t } = useLingui();
  const isMountedRef = useIsMounted();
  const latestStateRef = useRef(state);
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);
  const matches = useMeaningMatches({
    requestReply: suggestions.requestReply,
    model: suggestions.model,
    onFound: (found, _proposal, readId) => {
      if (isMountedRef.current) {
        dispatch({ type: "meaning_matches_found", matches: found, readId });
      }
    },
  });
  const [read, isReading] = useReadDatasets({
    onRead: (proposal, datasets) => {
      const firstName = datasets[0]?.dataset.name ?? "";
      _dispatchReadAndFindMatches({
        ...options,
        proposal,
        datasets,
        isCurrent:
          isMountedRef.current &&
          isSameDatasetSet(
            latestStateRef.current.pickedDatasetIds,
            datasets.map(({ dataset }) => {
              return dataset.id;
            }),
          ),
        defaultName: t`${firstName} codes`,
        findMatches: matches.findMatches,
      });
    },
    onFailed: (datasets) => {
      if (isMountedRef.current) {
        dispatch({
          type: "read_failed",
          datasetIds: datasets.map(({ dataset }) => {
            return dataset.id;
          }),
        });
      }
    },
  });
  return { read, isReading, meaningMatchStatus: matches.status };
}

/**
 * Reads the dataset whose menu opened the flow, once its columns load. When
 * the dataset cannot be found, for example because it was deleted or the user
 * has no access to it, the flow starts at Pick with a notice instead.
 */
function useReadOriginDataset(
  options: Readonly<{
    state: NewDictionaryState;
    dispatch: Dispatch<NewDictionaryAction>;
    sources: NewDictionarySources;
    read: (datasets: readonly ReadableDataset[]) => void;
  }>,
): void {
  const { state, dispatch, sources, read } = options;
  const { t } = useLingui();
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
    const readable = _getReadableDatasets(sources, [originDatasetId]);
    if (readable.length === 0) {
      dispatch({ type: "origin_dataset_unavailable" });
      notifyError(
        t`This dataset is no longer available. Pick the datasets to learn from.`,
      );
      return;
    }
    read(readable);
  }, [originDatasetId, proposal, sources, read, dispatch, t]);
}

/**
 * The Read datasets action: reads the picked datasets that can still be
 * found, or tells the user when none can, rather than reading an empty list.
 */
function useReadPicked(
  options: Readonly<{
    state: NewDictionaryState;
    sources: NewDictionarySources;
    read: (datasets: readonly ReadableDataset[]) => void;
  }>,
): () => void {
  const { state, sources, read } = options;
  const { t } = useLingui();
  return () => {
    const readable = _getReadableDatasets(sources, state.pickedDatasetIds);
    if (readable.length === 0) {
      notifyError(
        t`The picked datasets are no longer available. Pick the datasets to learn from.`,
      );
      return;
    }
    read(readable);
  };
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
  useReadOriginDataset({ state, dispatch, sources, read: reading.read });
  const labels = useSuggestLabels({
    proposal: state.proposal,
    readId: state.readId,
    model: suggestions.model,
    requestReply: suggestions.requestReply,
    dispatch,
  });
  const readPicked = useReadPicked({ state, sources, read: reading.read });
  const [create, isCreating] = useCreateDictionary();
  const applyTargets = _getApplyTargets(state, sources);
  const isCreatingRef = useRef(false);
  useEffect(() => {
    if (!isCreating) {
      isCreatingRef.current = false;
    }
  }, [isCreating]);
  return {
    suggestionAvailability: suggestions.availability,
    readPickedDatasets: readPicked,
    isReading: reading.isReading,
    meaningMatchStatus: reading.meaningMatchStatus,
    suggestLabels: labels.suggestLabels,
    getLabelsBlockReason: labels.getLabelsBlockReason,
    suggestingCodeListKey: labels.suggestingCodeListKey,
    createDictionary: _makeCreateDictionary({
      state,
      userProfile,
      applyTargets,
      create,
      isCreatingRef,
    }),
    isCreating,
    applyTargets,
  };
}
