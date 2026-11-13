import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** The steps of applying dictionaries, in order. */
export type ApplyStep = "match" | "attach";

/** The entry chosen for one column, with the code list that fits it. */
export type ColumnPick = {
  dictionaryId: DataDictionary.Id;
  entryId: DataDictionaryEntry.Id;
  codeListId: DataDictionaryCodeList.Id | undefined;
  direction: DictionaryBinding.Direction;
};

/** Everything the apply flow remembers while the user works. */
export type ApplyDictionariesState = {
  step: ApplyStep;
  /**
   * The dictionaries in use, in the order shown. Undefined until the
   * columns are matched.
   */
  dictionaryIds: readonly DataDictionary.Id[] | undefined;
  /** Each picked column's pick, by dataset column id. */
  picks: Readonly<Record<string, ColumnPick>>;
  selectedColumnId: DatasetColumn.Id | undefined;
  isShowingUnmatched: boolean;
};

/** Everything that changes the apply flow. */
export type ApplyDictionariesAction =
  | {
      /** The columns are matched. Ignored once a first match has landed. */
      type: "matches_ready";
      dictionaryIds: readonly DataDictionary.Id[];
      picks: Readonly<Record<string, ColumnPick>>;
      selectedColumnId: DatasetColumn.Id | undefined;
    }
  /** Picks a match, or clears it when it is already the column's pick. */
  | { type: "toggle_pick"; columnId: DatasetColumn.Id; pick: ColumnPick }
  /** Sets or clears a column's pick, as a select does. */
  | {
      type: "set_pick";
      columnId: DatasetColumn.Id;
      pick: ColumnPick | undefined;
    }
  | { type: "select_column"; columnId: DatasetColumn.Id }
  /** Adds a dictionary and the picks it brings to columns with none. */
  | {
      type: "add_dictionary";
      dictionaryId: DataDictionary.Id;
      picks: Readonly<Record<string, ColumnPick>>;
    }
  /** Stops using a dictionary and clears every pick from it. */
  | { type: "remove_dictionary"; dictionaryId: DataDictionary.Id }
  | { type: "toggle_unmatched" }
  | { type: "go_to_step"; step: ApplyStep };

/** The state before the columns are matched. */
export function makeInitialApplyState(): ApplyDictionariesState {
  return {
    step: "match",
    dictionaryIds: undefined,
    picks: {},
    selectedColumnId: undefined,
    isShowingUnmatched: false,
  };
}

/** Whether two picks name the same entry of the same dictionary. */
export function isSamePick(
  pickA: Readonly<ColumnPick> | undefined,
  pickB: Readonly<ColumnPick> | undefined,
): boolean {
  return (
    pickA !== undefined &&
    pickB !== undefined &&
    pickA.dictionaryId === pickB.dictionaryId &&
    pickA.entryId === pickB.entryId
  );
}

function _withPick(
  picks: Readonly<Record<string, ColumnPick>>,
  columnId: DatasetColumn.Id,
  pick: ColumnPick | undefined,
): Record<string, ColumnPick> {
  const { [columnId]: _replaced, ...rest } = picks;
  return pick ? { ...rest, [columnId]: pick } : rest;
}

function _withoutDictionary(
  state: ApplyDictionariesState,
  dictionaryId: DataDictionary.Id,
): ApplyDictionariesState {
  const picks = Object.fromEntries(
    Object.entries(state.picks).filter(([, pick]) => {
      return pick.dictionaryId !== dictionaryId;
    }),
  );
  const dictionaryIds = (state.dictionaryIds ?? []).filter((id) => {
    return id !== dictionaryId;
  });
  return { ...state, dictionaryIds, picks };
}

function _withDictionary(
  state: ApplyDictionariesState,
  action: Extract<ApplyDictionariesAction, { type: "add_dictionary" }>,
): ApplyDictionariesState {
  const dictionaryIds = state.dictionaryIds ?? [];
  if (dictionaryIds.includes(action.dictionaryId)) {
    return state;
  }
  return {
    ...state,
    dictionaryIds: [...dictionaryIds, action.dictionaryId],
    // A column the user already picked keeps its pick.
    picks: { ...action.picks, ...state.picks },
  };
}

/**
 * The apply flow's reducer: which dictionaries are in use, each column's
 * pick, the selected column, and the step. Used by the apply view.
 */
export function applyDictionariesReducer(
  state: ApplyDictionariesState,
  action: ApplyDictionariesAction,
): ApplyDictionariesState {
  switch (action.type) {
    case "matches_ready":
      return state.dictionaryIds !== undefined
        ? state
        : {
            ...state,
            dictionaryIds: action.dictionaryIds,
            picks: action.picks,
            selectedColumnId: action.selectedColumnId,
          };
    case "toggle_pick": {
      const isPicked = isSamePick(state.picks[action.columnId], action.pick);
      return {
        ...state,
        selectedColumnId: action.columnId,
        picks: _withPick(
          state.picks,
          action.columnId,
          isPicked ? undefined : action.pick,
        ),
      };
    }
    case "set_pick":
      return {
        ...state,
        selectedColumnId: action.columnId,
        picks: _withPick(state.picks, action.columnId, action.pick),
      };
    case "select_column":
      return { ...state, selectedColumnId: action.columnId };
    case "add_dictionary":
      return _withDictionary(state, action);
    case "remove_dictionary":
      return _withoutDictionary(state, action.dictionaryId);
    case "toggle_unmatched":
      return { ...state, isShowingUnmatched: !state.isShowingUnmatched };
    case "go_to_step":
      return { ...state, step: action.step };
  }
}
