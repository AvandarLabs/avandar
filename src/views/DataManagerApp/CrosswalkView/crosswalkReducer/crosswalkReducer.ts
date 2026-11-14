import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import {
  addColumn,
  addDatasets,
  changeColumn,
  changeSettings,
  chooseReference,
  confirmLayout,
  removeColumn,
  removeDataset,
  reopenLayout,
  seedColumns,
  setFill,
  skipLayout,
  updateMappings,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkDraftActions";
import { applyLayoutValues } from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/prefillCrosswalkLayout";
import type {
  CrosswalkAction,
  CrosswalkState,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";

type Handlers = {
  [Type in CrosswalkAction["type"]]: (
    state: CrosswalkState,
    action: Extract<CrosswalkAction, { type: Type }>,
  ) => CrosswalkState;
};

/**
 * The view's starting state. A saved crosswalk's draft is also what was
 * last saved; a new one has nothing saved yet.
 */
export function makeInitialCrosswalkState(
  draft: CrosswalkDraft.T,
  options: Readonly<{ isSaved: boolean }>,
): CrosswalkState {
  const startingDraft = { ...draft, isSaved: options.isSaved };
  return {
    draft: startingDraft,
    savedDraft: options.isSaved ? startingDraft : undefined,
    readLayoutIds: [],
  };
}

/** Whether the draft holds changes that are not saved. */
export function isCrosswalkDirty(state: CrosswalkState): boolean {
  return (
    state.savedDraft === undefined ||
    !CrosswalkDraft.isSameContent(state.draft, state.savedDraft)
  );
}

/**
 * Whether another layout can become the reference: only while no other
 * layout is mapped, since its confirmed fills were made against this one.
 */
export function canChangeReference(draft: CrosswalkDraft.T): boolean {
  return !draft.layouts.some((layout) => {
    return !layout.isReference && layout.status === "mapped";
  });
}

/** The state with a new draft, forgetting reads of layouts that are gone. */
function _withDraft(
  state: CrosswalkState,
  draft: CrosswalkDraft.T,
): CrosswalkState {
  if (draft === state.draft) {
    return state;
  }
  const layoutIds = new Set(
    draft.layouts.map((layout) => {
      return layout.id;
    }),
  );
  return {
    ...state,
    draft,
    readLayoutIds: state.readLayoutIds.filter((layoutId) => {
      return layoutIds.has(layoutId);
    }),
  };
}

const HANDLERS: Handlers = {
  renamed: (state, action) => {
    return _withDraft(state, { ...state.draft, name: action.name });
  },
  datasets_added: (state, action) => {
    return _withDraft(
      state,
      addDatasets(state.draft, action.datasetIds, action.context),
    );
  },
  dataset_removed: (state, action) => {
    return _withDraft(state, removeDataset(state.draft, action.datasetId));
  },
  reference_chosen: (state, action) => {
    const draft = canChangeReference(state.draft)
      ? chooseReference(state.draft, action.layoutId)
      : state.draft;
    return draft === state.draft
      ? state
      : { ...state, draft, readLayoutIds: [] };
  },
  columns_seeded: (state, action) => {
    return _withDraft(
      state,
      seedColumns(state.draft, action.bindingsByColumnName, action.context),
    );
  },
  values_read: (state, action) => {
    const isKnown = state.draft.layouts.some((layout) => {
      return layout.id === action.layoutId;
    });
    if (!isKnown) {
      return state;
    }
    const readLayoutIds = state.readLayoutIds.includes(action.layoutId)
      ? state.readLayoutIds
      : [...state.readLayoutIds, action.layoutId];
    return {
      ...state,
      draft: applyLayoutValues(state.draft, action),
      readLayoutIds,
    };
  },
  fill_set: (state, action) => {
    return _withDraft(state, setFill(state.draft, action));
  },
  suggestion_accepted: (state, action) => {
    return _withDraft(
      state,
      updateMappings(state.draft, action.layoutId, (mapping, columnId) => {
        return columnId === action.columnId && mapping.status === "suggested"
          ? { ...mapping, status: "confirmed" }
          : mapping;
      }),
    );
  },
  suggestion_rejected: (state, action) => {
    return _withDraft(
      state,
      updateMappings(state.draft, action.layoutId, (mapping, columnId) => {
        return columnId === action.columnId && mapping.status === "suggested"
          ? undefined
          : mapping;
      }),
    );
  },
  suggestions_accepted: (state, action) => {
    return _withDraft(
      state,
      updateMappings(state.draft, action.layoutId, (mapping) => {
        return { ...mapping, status: "confirmed" };
      }),
    );
  },
  layout_confirmed: (state, action) => {
    return _withDraft(state, confirmLayout(state.draft, action.layoutId));
  },
  layout_skipped: (state, action) => {
    return _withDraft(state, skipLayout(state.draft, action.layoutId));
  },
  layout_reopened: (state, action) => {
    return _withDraft(state, reopenLayout(state.draft, action.layoutId));
  },
  column_added: (state, action) => {
    return _withDraft(state, addColumn(state.draft, action));
  },
  column_changed: (state, action) => {
    const before = state.draft.columns.find((column) => {
      return column.id === action.columnId;
    });
    const draft = changeColumn(state.draft, action);
    const after = draft.columns.find((column) => {
      return column.id === action.columnId;
    });
    // A new entry means new code lists to choose, so every layout is read
    // again.
    return before?.entryId === after?.entryId
      ? _withDraft(state, draft)
      : { ...state, draft, readLayoutIds: [] };
  },
  column_removed: (state, action) => {
    return _withDraft(state, removeColumn(state.draft, action.columnId));
  },
  settings_changed: (state, action) => {
    return _withDraft(state, changeSettings(state.draft, action));
  },
  saved: (state, action) => {
    // An edit made while the save was in flight stays, unsaved.
    const draft = CrosswalkDraft.isSameContent(state.draft, action.draft)
      ? action.draft
      : { ...state.draft, isSaved: true };
    return { ...state, draft, savedDraft: action.draft };
  },
};

/**
 * Applies one user action, or one loading result, to the crosswalk view's
 * state. Mints ids for the layouts, columns, and mappings it creates, so
 * `useCrosswalkFlow` runs it once per action rather than through
 * `useReducer`.
 */
export function crosswalkReducer(
  state: CrosswalkState,
  action: CrosswalkAction,
): CrosswalkState {
  const handler = HANDLERS[action.type] as (
    state: CrosswalkState,
    action: CrosswalkAction,
  ) => CrosswalkState;
  return handler(state, action);
}
