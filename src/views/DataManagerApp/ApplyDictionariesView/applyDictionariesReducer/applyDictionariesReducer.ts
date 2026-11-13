import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";

/** The steps of applying dictionaries, in order. */
export type ApplyStep = "match" | "unmatched" | "save";

/** The entry chosen for one column, and how it is applied. */
export type ColumnPick = {
  dictionaryId: DataDictionary.Id;
  entryId: DataDictionaryEntry.Id;
  codeListId: DataDictionaryCodeList.Id | undefined;
  direction: DictionaryBinding.Direction;
  /** Whether the values are converted or only explained. */
  mode: DictionaryBinding.Mode;
  /** Whether the direction was read from the data rather than chosen. */
  isDirectionFromData: boolean;
  /** Whether a converted column keeps a `<column>_original` copy. */
  keepsOriginal: boolean;
};

/** How the user resolved one value no pair matches. */
export type ValueResolution =
  | { action: "keep" }
  | { action: "empty" }
  | { action: "map"; code: string }
  | { action: "add"; text: string };

/** Where a dataset's conversions are saved. */
export type SaveTarget = "linked" | "in_place";

/** One column's resolutions, by value key. */
type ColumnResolutions = Readonly<Record<string, ValueResolution>>;

/** Everything the apply flow remembers while the user works. */
export type ApplyDictionariesState = {
  step: ApplyStep;
  /** The dictionaries in use, in order. Undefined until columns match. */
  dictionaryIds: readonly DataDictionary.Id[] | undefined;
  /** Each picked column's pick, by dataset column id. */
  picks: Readonly<Record<string, ColumnPick>>;
  selectedColumnId: DatasetColumn.Id | undefined;
  isShowingUnmatched: boolean;
  /** The mode a newly picked coded column starts in. */
  defaultMode: DictionaryBinding.Mode;
  /** Resolved values, by dataset column id, then value key. */
  resolutions: Readonly<Record<string, ColumnResolutions>>;
  saveTarget: SaveTarget | undefined;
  /** The linked dataset's name as typed; undefined uses the default. */
  linkedDatasetName: string | undefined;
  /** Whether the user ticked that changing in place affects everyone. */
  hasConfirmedWorkspaceChange: boolean;
  isPreviewOpen: boolean;
};

/** Everything that changes the apply flow. */
export type ApplyDictionariesAction =
  | {
      /** The columns are matched. Ignored once a first match has landed. */
      type: "matches_ready";
      dictionaryIds: readonly DataDictionary.Id[];
      picks: Readonly<Record<string, ColumnPick>>;
      selectedColumnId: DatasetColumn.Id | undefined;
      defaultMode: DictionaryBinding.Mode;
      resolutions: Readonly<Record<string, ColumnResolutions>>;
      saveTarget: SaveTarget | undefined;
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
  | { type: "go_to_step"; step: ApplyStep }
  | {
      type: "set_mode";
      columnId: DatasetColumn.Id;
      mode: DictionaryBinding.Mode;
    }
  /** Convert all, or attach every dictionary only as reference. */
  | { type: "set_all_modes"; mode: DictionaryBinding.Mode }
  | {
      type: "set_direction";
      columnId: DatasetColumn.Id;
      direction: DictionaryBinding.Direction;
    }
  | {
      type: "set_keeps_original";
      columnId: DatasetColumn.Id;
      keepsOriginal: boolean;
    }
  | {
      type: "resolve_value";
      columnId: DatasetColumn.Id;
      valueKey: string;
      resolution: ValueResolution;
    }
  | { type: "set_save_target"; saveTarget: SaveTarget }
  | { type: "set_linked_name"; name: string }
  | { type: "set_workspace_change_confirmed"; isConfirmed: boolean }
  | { type: "set_preview_open"; isOpen: boolean };

/** The state before the columns are matched. */
export function makeInitialApplyState(): ApplyDictionariesState {
  return {
    step: "match",
    dictionaryIds: undefined,
    picks: {},
    selectedColumnId: undefined,
    isShowingUnmatched: false,
    defaultMode: "reference",
    resolutions: {},
    saveTarget: undefined,
    linkedDatasetName: undefined,
    hasConfirmedWorkspaceChange: false,
    isPreviewOpen: false,
  };
}

/**
 * The key a value's resolution is stored under: lowercased, with leading
 * and trailing spaces removed (spaces only, as DuckDB's `trim` does, so the
 * key agrees with the conversion's SQL). It only keys the reducer's map;
 * every comparison against data happens in SQL.
 */
export function toValueKey(value: string): string {
  return trimSpaces(value).toLowerCase();
}

/**
 * `text` without leading and trailing spaces. Only spaces, as DuckDB's
 * `trim` does, so text the apply flow sends agrees with the conversion's SQL.
 */
export function trimSpaces(text: string): string {
  return text.replace(/^ +| +$/g, "");
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

/** A new pick in the default mode; a pick of the same entry stays as is. */
function _settlePick(
  state: ApplyDictionariesState,
  columnId: DatasetColumn.Id,
  pick: ColumnPick,
): ColumnPick {
  const current = state.picks[columnId];
  if (current && isSamePick(current, pick)) {
    return current;
  }
  return {
    ...pick,
    mode: pick.codeListId ? state.defaultMode : "reference",
    keepsOriginal: false,
  };
}

function _withoutKey<Value>(
  record: Readonly<Record<string, Value>>,
  key: string,
): Record<string, Value> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

function _withPick(
  state: ApplyDictionariesState,
  columnId: DatasetColumn.Id,
  pick: ColumnPick | undefined,
): ApplyDictionariesState {
  const settled = pick ? _settlePick(state, columnId, pick) : undefined;
  const picks = _withoutKey(state.picks, columnId);
  const isSameEntry = isSamePick(state.picks[columnId], settled);
  return {
    ...state,
    selectedColumnId: columnId,
    picks: settled ? { ...picks, [columnId]: settled } : picks,
    // A different entry or list gives the values a different meaning.
    resolutions: isSameEntry
      ? state.resolutions
      : _withoutKey(state.resolutions, columnId),
  };
}

/** Updates one column's pick, if it has one. */
function _updatePick(
  state: ApplyDictionariesState,
  columnId: DatasetColumn.Id,
  update: (pick: ColumnPick) => ColumnPick,
): ApplyDictionariesState {
  const pick = state.picks[columnId];
  return pick
    ? { ...state, picks: { ...state.picks, [columnId]: update(pick) } }
    : state;
}

/** A pick in `mode`. Only a pick with a code list can convert. */
function _inMode(pick: ColumnPick, mode: DictionaryBinding.Mode): ColumnPick {
  const nextMode = pick.codeListId ? mode : "reference";
  return {
    ...pick,
    mode: nextMode,
    keepsOriginal: nextMode === "convert" && pick.keepsOriginal,
  };
}

/**
 * Puts each of `columnIds` that has a pick in `mode`. A column whose mode
 * changes forgets its resolutions, which were chosen for the other mode.
 */
function _withModes(
  state: ApplyDictionariesState,
  columnIds: readonly string[],
  mode: DictionaryBinding.Mode,
): ApplyDictionariesState {
  return columnIds.reduce((current, columnId) => {
    const pick = current.picks[columnId];
    if (!pick) {
      return current;
    }
    const updated = _inMode(pick, mode);
    return {
      ...current,
      picks: { ...current.picks, [columnId]: updated },
      resolutions:
        updated.mode === pick.mode
          ? current.resolutions
          : _withoutKey(current.resolutions, columnId),
    };
  }, state);
}

function _withAllModes(
  state: ApplyDictionariesState,
  mode: DictionaryBinding.Mode,
): ApplyDictionariesState {
  const updated = _withModes(state, Object.keys(state.picks), mode);
  return { ...updated, defaultMode: mode };
}

function _withDirection(
  state: ApplyDictionariesState,
  columnId: DatasetColumn.Id,
  direction: DictionaryBinding.Direction,
): ApplyDictionariesState {
  const updated = _updatePick(state, columnId, (pick) => {
    return { ...pick, direction, isDirectionFromData: false };
  });
  return { ...updated, resolutions: _withoutKey(state.resolutions, columnId) };
}

function _withResolution(
  state: ApplyDictionariesState,
  action: Extract<ApplyDictionariesAction, { type: "resolve_value" }>,
): ApplyDictionariesState {
  const current = state.resolutions[action.columnId] ?? {};
  return {
    ...state,
    resolutions: {
      ...state.resolutions,
      [action.columnId]: { ...current, [action.valueKey]: action.resolution },
    },
  };
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
  const added = Object.fromEntries(
    Object.entries(action.picks).map(([columnId, pick]) => {
      return [columnId, _inMode(pick, state.defaultMode)] as const;
    }),
  );
  return {
    ...state,
    dictionaryIds: [...dictionaryIds, action.dictionaryId],
    // A column the user already picked keeps its pick.
    picks: { ...added, ...state.picks },
  };
}

function _withMatches(
  state: ApplyDictionariesState,
  action: Extract<ApplyDictionariesAction, { type: "matches_ready" }>,
): ApplyDictionariesState {
  if (state.dictionaryIds !== undefined) {
    return state;
  }
  const { type: _type, ...ready } = action;
  return { ...state, ...ready };
}

type Handlers = {
  [Type in ApplyDictionariesAction["type"]]: (
    state: ApplyDictionariesState,
    action: Extract<ApplyDictionariesAction, { type: Type }>,
  ) => ApplyDictionariesState;
};

const HANDLERS: Handlers = {
  matches_ready: _withMatches,
  toggle_pick: (state, action) => {
    const isPicked = isSamePick(state.picks[action.columnId], action.pick);
    return _withPick(
      state,
      action.columnId,
      isPicked ? undefined : action.pick,
    );
  },
  set_pick: (state, action) => {
    return _withPick(state, action.columnId, action.pick);
  },
  select_column: (state, action) => {
    return { ...state, selectedColumnId: action.columnId };
  },
  add_dictionary: _withDictionary,
  remove_dictionary: (state, action) => {
    return _withoutDictionary(state, action.dictionaryId);
  },
  toggle_unmatched: (state) => {
    return { ...state, isShowingUnmatched: !state.isShowingUnmatched };
  },
  go_to_step: (state, action) => {
    return { ...state, step: action.step };
  },
  set_mode: (state, action) => {
    return _withModes(state, [action.columnId], action.mode);
  },
  set_all_modes: (state, action) => {
    return _withAllModes(state, action.mode);
  },
  set_direction: (state, action) => {
    return _withDirection(state, action.columnId, action.direction);
  },
  set_keeps_original: (state, action) => {
    return _updatePick(state, action.columnId, (pick) => {
      return {
        ...pick,
        keepsOriginal: pick.mode === "convert" && action.keepsOriginal,
      };
    });
  },
  resolve_value: _withResolution,
  set_save_target: (state, action) => {
    return {
      ...state,
      saveTarget: action.saveTarget,
      hasConfirmedWorkspaceChange: false,
    };
  },
  set_linked_name: (state, action) => {
    return { ...state, linkedDatasetName: action.name };
  },
  set_workspace_change_confirmed: (state, action) => {
    return { ...state, hasConfirmedWorkspaceChange: action.isConfirmed };
  },
  set_preview_open: (state, action) => {
    return { ...state, isPreviewOpen: action.isOpen };
  },
};

/**
 * The apply flow's reducer: the dictionaries in use, each column's pick and
 * how it is applied, how unmatched values are resolved, where conversions
 * are saved, and the step. Used by the apply view.
 */
export function applyDictionariesReducer(
  state: ApplyDictionariesState,
  action: ApplyDictionariesAction,
): ApplyDictionariesState {
  const handle = HANDLERS[action.type] as (
    state: ApplyDictionariesState,
    action: ApplyDictionariesAction,
  ) => ApplyDictionariesState;
  return handle(state, action);
}
