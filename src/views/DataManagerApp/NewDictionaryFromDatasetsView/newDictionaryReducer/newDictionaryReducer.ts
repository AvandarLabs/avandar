import { DictionaryProposal } from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** The create flow's steps, in order. */
export type NewDictionaryStep = "pick" | "review" | "label" | "save";

/**
 * The user's answer to sending suggestions online, asked on the first
 * online send of the flow and kept until the flow closes.
 */
export type SuggestionConsent = "not_asked" | "approved" | "declined";

/**
 * Everything the create flow holds while someone learns a dictionary from
 * datasets. Nothing is written anywhere until the Save step.
 */
export type NewDictionaryState = {
  step: NewDictionaryStep;
  /** The dataset whose menu opened the flow. While set, there is no Pick. */
  originDatasetId: Dataset.Id | undefined;
  pickedDatasetIds: Dataset.Id[];
  /** Undefined until the picked datasets are read. */
  proposal: DictionaryProposal.T | undefined;
  labels: DictionaryProposal.Labels;
  selectedCodeListKey: string | undefined;
  name: string;
  description: string;
  suggestionConsent: SuggestionConsent;
};

/** Everything the create flow's steps can change. */
export type NewDictionaryAction =
  | { type: "toggle_dataset"; datasetId: Dataset.Id }
  | {
      type: "datasets_read";
      proposal: DictionaryProposal.T;
      defaultName: string;
    }
  | { type: "go_to_step"; step: NewDictionaryStep }
  | { type: "learn_from_more" }
  | { type: "rename_entry"; entryKey: string; name: string }
  | { type: "set_entry_kind"; entryKey: string; kind: DataDictionaryEntry.Kind }
  | { type: "set_entry_included"; entryKey: string; isIncluded: boolean }
  | { type: "keep_apart"; entryKey: string }
  | { type: "set_entry_description"; entryKey: string; description: string }
  | {
      type: "meaning_matches_found";
      matches: readonly DictionaryProposal.MeaningMatch[];
    }
  | { type: "select_code_list"; codeListKey: string }
  | {
      type: "set_value_label";
      codeListKey: string;
      code: string;
      label: string;
    }
  | {
      type: "set_value_missing";
      codeListKey: string;
      code: string;
      isMissing: boolean;
    }
  | {
      type: "labels_suggested";
      codeListKey: string;
      /** The one entry using the list, which gets the description. */
      entryKey: string | undefined;
      suggestions: DictionaryProposal.LabelSuggestions;
    }
  | { type: "accept_code_list"; codeListKey: string }
  | { type: "set_name"; name: string }
  | { type: "set_description"; description: string }
  | { type: "suggestion_consent_decided"; isApproved: boolean };

type Handlers = {
  [Type in NewDictionaryAction["type"]]: (
    state: NewDictionaryState,
    action: Extract<NewDictionaryAction, { type: Type }>,
  ) => NewDictionaryState;
};

/** The state with a new proposal, its labels filled in, a list selected. */
function _withProposal(
  state: NewDictionaryState,
  proposal: DictionaryProposal.T,
): NewDictionaryState {
  const { codeLists } = DictionaryProposal.getCodings(proposal);
  const isSelectionKept = codeLists.some((codeList) => {
    return codeList.key === state.selectedCodeListKey;
  });
  return {
    ...state,
    proposal,
    labels: DictionaryProposal.withDefaultLabels(state.labels, codeLists),
    selectedCodeListKey: isSelectionKept
      ? state.selectedCodeListKey
      : codeLists[0]?.key,
  };
}

function _editProposal(
  state: NewDictionaryState,
  edit: (proposal: DictionaryProposal.T) => DictionaryProposal.T,
): NewDictionaryState {
  return state.proposal ? _withProposal(state, edit(state.proposal)) : state;
}

function _toggleDataset(
  datasetIds: readonly Dataset.Id[],
  datasetId: Dataset.Id,
): Dataset.Id[] {
  return datasetIds.includes(datasetId)
    ? datasetIds.filter((current) => {
        return current !== datasetId;
      })
    : [...datasetIds, datasetId];
}

function _acceptAndSelectNext(
  state: NewDictionaryState,
  codeListKey: string,
): NewDictionaryState {
  const keys = state.proposal
    ? DictionaryProposal.getCodings(state.proposal).codeLists.map(
        (codeList) => {
          return codeList.key;
        },
      )
    : [];
  return {
    ...state,
    labels: DictionaryProposal.acceptCodeList(state.labels, codeListKey),
    selectedCodeListKey: keys[keys.indexOf(codeListKey) + 1] ?? codeListKey,
  };
}

function _applySuggestedLabels(
  state: NewDictionaryState,
  action: Extract<NewDictionaryAction, { type: "labels_suggested" }>,
): NewDictionaryState {
  const { codeListKey, entryKey, suggestions } = action;
  const withLabels = {
    ...state,
    labels: DictionaryProposal.applyLabelSuggestions(state.labels, {
      codeListKey,
      suggestions,
    }),
  };
  if (!entryKey || suggestions.description === "") {
    return withLabels;
  }
  return _editProposal(withLabels, (proposal) => {
    return DictionaryProposal.suggestEntryDescription(proposal, {
      entryKey,
      description: suggestions.description,
    });
  });
}

const HANDLERS: Handlers = {
  toggle_dataset: (state, action) => {
    const pickedDatasetIds = _toggleDataset(
      state.pickedDatasetIds,
      action.datasetId,
    );
    return { ...state, pickedDatasetIds };
  },
  datasets_read: (state, action) => {
    const name = state.name || action.defaultName;
    return { ..._withProposal(state, action.proposal), step: "review", name };
  },
  go_to_step: (state, action) => {
    return { ...state, step: action.step };
  },
  learn_from_more: (state) => {
    return { ...state, step: "pick", originDatasetId: undefined };
  },
  rename_entry: (state, action) => {
    // Code list keys do not depend on entry names, so labels stay put.
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.renameEntry(proposal, action);
    });
  },
  set_entry_kind: (state, action) => {
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.setEntryKind(proposal, action);
    });
  },
  set_entry_included: (state, action) => {
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.setEntryIncluded(proposal, action);
    });
  },
  keep_apart: (state, action) => {
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.keepApart(proposal, action.entryKey);
    });
  },
  set_entry_description: (state, action) => {
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.setEntryDescription(proposal, action);
    });
  },
  meaning_matches_found: (state, action) => {
    return _editProposal(state, (proposal) => {
      return DictionaryProposal.applyMeaningMatches(proposal, action.matches);
    });
  },
  select_code_list: (state, action) => {
    return { ...state, selectedCodeListKey: action.codeListKey };
  },
  set_value_label: (state, action) => {
    return {
      ...state,
      labels: DictionaryProposal.setValueLabel(state.labels, action),
    };
  },
  set_value_missing: (state, action) => {
    return {
      ...state,
      labels: DictionaryProposal.setValueMissing(state.labels, action),
    };
  },
  labels_suggested: _applySuggestedLabels,
  accept_code_list: (state, action) => {
    return _acceptAndSelectNext(state, action.codeListKey);
  },
  set_name: (state, action) => {
    return { ...state, name: action.name };
  },
  set_description: (state, action) => {
    return { ...state, description: action.description };
  },
  suggestion_consent_decided: (state, action) => {
    const suggestionConsent = action.isApproved ? "approved" : "declined";
    return { ...state, suggestionConsent };
  },
};

/**
 * The create flow's state when it opens: at Pick, or at Review with the
 * dataset already picked when the flow was opened from a dataset's menu.
 * `useReducer`'s initializer in `NewDictionaryFromDatasetsView`.
 */
export function makeInitialNewDictionaryState(
  originDatasetId: Dataset.Id | undefined,
): NewDictionaryState {
  return {
    step: originDatasetId ? "review" : "pick",
    originDatasetId,
    pickedDatasetIds: originDatasetId ? [originDatasetId] : [],
    proposal: undefined,
    labels: {},
    selectedCodeListKey: undefined,
    name: "",
    description: "",
    suggestionConsent: "not_asked",
  };
}

/**
 * The create flow's reducer: every change a step makes, from picking a
 * dataset to typing a label. `NewDictionaryFromDatasetsView` owns it and
 * hands its state and dispatch to each step.
 */
export function newDictionaryReducer(
  state: NewDictionaryState,
  action: NewDictionaryAction,
): NewDictionaryState {
  // Each handler takes the action of its own type. TypeScript cannot tie a
  // lookup by `action.type` to that pairing, so the handler is widened here.
  const handler = HANDLERS[action.type] as (
    current: NewDictionaryState,
    currentAction: NewDictionaryAction,
  ) => NewDictionaryState;
  return handler(state, action);
}
