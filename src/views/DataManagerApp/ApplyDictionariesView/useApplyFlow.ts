import { useEffect, useMemo, useReducer } from "react";
import { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import {
  makeInitialSelection,
  pickDefaultsForColumns,
  resolutionsFromBindings,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import {
  applyDictionariesReducer,
  makeInitialApplyState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import {
  getDefaultMode,
  getDefaultSaveTarget,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";
import { useDatasetProfiles } from "@/views/DataManagerApp/ApplyDictionariesView/useDatasetProfiles";
import { useUnmatchedValues } from "@/views/DataManagerApp/ApplyDictionariesView/useUnmatchedValues";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { MatchesByColumnName } from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import type {
  ApplyDictionariesAction,
  ApplyDictionariesState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyTargets } from "@/views/DataManagerApp/ApplyDictionariesView/applyTargets/applyTargets";
import type { ApplyDictionariesData } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData";
import type { DatasetProfiles } from "@/views/DataManagerApp/ApplyDictionariesView/useDatasetProfiles";
import type { UnmatchedValues } from "@/views/DataManagerApp/ApplyDictionariesView/useUnmatchedValues";
import type { Dispatch } from "react";

const NO_PROFILES: readonly ColumnProfile.T[] = [];

/** One column of the dataset as the pairing table shows it. */
export type ApplyColumnRow = {
  column: DatasetColumn.T;
  profile: ColumnProfile.T | undefined;
  /** Matches from the dictionaries in use, best first. */
  matches: readonly DictionaryMatch.T[];
};

/** The apply flow's state and what its steps read and do. */
export type ApplyFlow = {
  state: ApplyDictionariesState;
  dispatch: Dispatch<ApplyDictionariesAction>;
  /** Columns with a match or a pick, in the dataset's order. */
  rows: readonly ApplyColumnRow[];
  /** Columns no dictionary in use matches. */
  unmatchedRows: readonly ApplyColumnRow[];
  addDictionary: (dictionaryId: DataDictionary.Id) => void;
  isMatching: boolean;
  hasReadFailed: boolean;
  /** Where this dataset's conversions can go. Set once the flow is ready. */
  targets: ApplyTargets | undefined;
  /** Each coded column's values no pair matches, read on the device. */
  unmatched: UnmatchedValues;
};

function _buildRows(
  data: Readonly<ApplyDictionariesData>,
  options: Readonly<{
    state: ApplyDictionariesState;
    profiles: readonly ColumnProfile.T[];
    matchesByColumnName: MatchesByColumnName;
  }>,
): { rows: ApplyColumnRow[]; unmatchedRows: ApplyColumnRow[] } {
  const dictionaryIds = options.state.dictionaryIds ?? [];
  const profilesByName = new Map(
    options.profiles.map((profile) => {
      return [profile.columnName, profile] as const;
    }),
  );
  const all = (data.columns ?? []).map((column) => {
    return {
      column,
      profile: profilesByName.get(column.name),
      matches: (options.matchesByColumnName.get(column.name) ?? []).filter(
        (match) => {
          return dictionaryIds.includes(match.dictionaryId);
        },
      ),
    };
  });
  const isShown = (row: ApplyColumnRow): boolean => {
    return (
      row.matches.length > 0 || options.state.picks[row.column.id] !== undefined
    );
  };
  return {
    rows: all.filter(isShown),
    unmatchedRows: all.filter((row) => {
      return !isShown(row);
    }),
  };
}

/** Reads the dataset's columns on the device and matches every dictionary. */
function useColumnMatches(data: Readonly<ApplyDictionariesData>): {
  read: DatasetProfiles;
  profiles: readonly ColumnProfile.T[];
  matchesByColumnName: MatchesByColumnName;
} {
  const read = useDatasetProfiles({
    dataset: data.dataset,
    columns: data.columns,
  });
  const profiles = read.status === "ready" ? read.profiles : NO_PROFILES;
  const matchesByColumnName = useMemo(() => {
    return DictionaryMatch.findColumnMatches(profiles, data.matchEntries);
  }, [profiles, data.matchEntries]);
  return { read, profiles, matchesByColumnName };
}

/**
 * The apply flow: reads the dataset's columns on the device, matches them
 * against every dictionary, opens with the default picks in the mode this
 * dataset's targets allow, and keeps the user's choices. Used by the apply
 * view.
 */
export function useApplyFlow(
  options: Readonly<{
    data: ApplyDictionariesData;
    preselectedDictionaryId: DataDictionary.Id | undefined;
    targets: ApplyTargets | undefined;
  }>,
): ApplyFlow {
  const { data } = options;
  const [state, dispatch] = useReducer(
    applyDictionariesReducer,
    undefined,
    makeInitialApplyState,
  );
  const { read, profiles, matchesByColumnName } = useColumnMatches(data);
  const isReady =
    read.status === "ready" && !data.isLoading && options.targets !== undefined;
  useOpenWithDefaults({
    data,
    matchesByColumnName,
    isReady,
    dispatch,
    preselectedDictionaryId: options.preselectedDictionaryId,
    targets: options.targets,
  });
  const { rows, unmatchedRows } = useMemo(() => {
    return _buildRows(data, { state, profiles, matchesByColumnName });
  }, [data, state, profiles, matchesByColumnName]);
  const codeListsById = useMemo(() => {
    return new Map(
      data.codeLists.map((codeList) => {
        return [codeList.id, codeList] as const;
      }),
    );
  }, [data.codeLists]);
  const unmatched = useUnmatchedValues({
    dataset: isReady ? data.dataset : undefined,
    columns: data.columns,
    picks: state.picks,
    codeLists: codeListsById,
  });
  const addDictionary = useAddDictionary(data, matchesByColumnName, dispatch);
  return {
    state,
    dispatch,
    rows,
    unmatchedRows,
    addDictionary,
    isMatching: !isReady,
    hasReadFailed: read.status === "failed",
    targets: options.targets,
    unmatched,
  };
}

/** Adds a dictionary with the picks it brings to columns with none. */
function useAddDictionary(
  data: Readonly<ApplyDictionariesData>,
  matchesByColumnName: MatchesByColumnName,
  dispatch: Dispatch<ApplyDictionariesAction>,
): (dictionaryId: DataDictionary.Id) => void {
  return (dictionaryId) => {
    const picks = pickDefaultsForColumns({
      columns: data.columns ?? [],
      matchesByColumnName,
      dictionaryIds: [dictionaryId],
    });
    dispatch({ type: "add_dictionary", dictionaryId, picks });
  };
}

/** Dispatches the first picks once the columns are read and matched. */
function useOpenWithDefaults(
  options: Readonly<{
    data: ApplyDictionariesData;
    matchesByColumnName: MatchesByColumnName;
    isReady: boolean;
    preselectedDictionaryId: DataDictionary.Id | undefined;
    dispatch: Dispatch<ApplyDictionariesAction>;
    targets: ApplyTargets | undefined;
  }>,
): void {
  const { data, matchesByColumnName, isReady, dispatch, targets } = options;
  useEffect(() => {
    if (!isReady || !targets || !data.dataset) {
      return;
    }
    const defaultMode = getDefaultMode(targets, data.dataset.sourceType);
    const selection = makeInitialSelection({
      columns: data.columns ?? [],
      matchesByColumnName,
      existingBindings: data.existingBindings,
      preselectedDictionaryId: options.preselectedDictionaryId,
      dictionaries: data.dictionaries,
      defaultMode,
    });
    const firstColumn = (data.columns ?? []).find((column) => {
      return selection.picks[column.id] !== undefined;
    });
    // The reducer keeps the first result, so a later run changes nothing.
    dispatch({
      type: "matches_ready",
      ...selection,
      selectedColumnId: firstColumn?.id,
      defaultMode,
      resolutions: resolutionsFromBindings(data.existingBindings),
      saveTarget: getDefaultSaveTarget(targets),
    });
  }, [
    isReady,
    data,
    matchesByColumnName,
    options.preselectedDictionaryId,
    targets,
    dispatch,
  ]);
}
