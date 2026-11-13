import { useEffect, useMemo, useReducer } from "react";
import { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import {
  makeInitialSelection,
  pickDefaultsForColumns,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import {
  applyDictionariesReducer,
  makeInitialApplyState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import { useDatasetProfiles } from "@/views/DataManagerApp/ApplyDictionariesView/useDatasetProfiles";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { MatchesByColumnName } from "@/views/DataManagerApp/ApplyDictionariesView/applyDefaults/applyDefaults";
import type {
  ApplyDictionariesAction,
  ApplyDictionariesState,
} from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";
import type { ApplyDictionariesData } from "@/views/DataManagerApp/ApplyDictionariesView/useApplyDictionariesData";
import type { DatasetProfiles } from "@/views/DataManagerApp/ApplyDictionariesView/useDatasetProfiles";
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
 * against every dictionary, opens with the default picks, and keeps the
 * user's choices. Used by the apply view.
 */
export function useApplyFlow(
  options: Readonly<{
    data: ApplyDictionariesData;
    preselectedDictionaryId: DataDictionary.Id | undefined;
  }>,
): ApplyFlow {
  const { data } = options;
  const [state, dispatch] = useReducer(
    applyDictionariesReducer,
    undefined,
    makeInitialApplyState,
  );
  const { read, profiles, matchesByColumnName } = useColumnMatches(data);
  const isReady = read.status === "ready" && !data.isLoading;
  useOpenWithDefaults({
    data,
    matchesByColumnName,
    isReady,
    dispatch,
    preselectedDictionaryId: options.preselectedDictionaryId,
  });
  const { rows, unmatchedRows } = useMemo(() => {
    return _buildRows(data, { state, profiles, matchesByColumnName });
  }, [data, state, profiles, matchesByColumnName]);
  const addDictionary = (dictionaryId: DataDictionary.Id): void => {
    const picks = pickDefaultsForColumns({
      columns: data.columns ?? [],
      matchesByColumnName,
      dictionaryIds: [dictionaryId],
    });
    dispatch({ type: "add_dictionary", dictionaryId, picks });
  };
  return {
    state,
    dispatch,
    rows,
    unmatchedRows,
    addDictionary,
    isMatching: !isReady,
    hasReadFailed: read.status === "failed",
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
  }>,
): void {
  const { data, matchesByColumnName, isReady, dispatch } = options;
  useEffect(() => {
    if (!isReady) {
      return;
    }
    const selection = makeInitialSelection({
      columns: data.columns ?? [],
      matchesByColumnName,
      existingBindings: data.existingBindings,
      preselectedDictionaryId: options.preselectedDictionaryId,
      dictionaries: data.dictionaries,
    });
    const firstColumn = (data.columns ?? []).find((column) => {
      return selection.picks[column.id] !== undefined;
    });
    // The reducer keeps the first result, so a later run changes nothing.
    dispatch({
      type: "matches_ready",
      ...selection,
      selectedColumnId: firstColumn?.id,
    });
  }, [
    isReady,
    data,
    matchesByColumnName,
    options.preselectedDictionaryId,
    dispatch,
  ]);
}
