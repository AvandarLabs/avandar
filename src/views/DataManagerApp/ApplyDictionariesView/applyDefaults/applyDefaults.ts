import { DictionaryMatch } from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DictionaryBinding } from "$/models/dataDictionaries/DictionaryBinding/DictionaryBinding";
import type { DatasetColumn } from "$/models/datasets/DatasetColumn/DatasetColumn";
import type { ColumnPick } from "@/views/DataManagerApp/ApplyDictionariesView/applyDictionariesReducer/applyDictionariesReducer";

type ApplyColumnRef = Readonly<{ id: DatasetColumn.Id; name: string }>;

/** Every match of every column, by column name. */
export type MatchesByColumnName = ReadonlyMap<
  string,
  readonly DictionaryMatch.T[]
>;

/** The pick a match stands for. */
export function toColumnPick(match: Readonly<DictionaryMatch.T>): ColumnPick {
  return {
    dictionaryId: match.dictionaryId,
    entryId: match.entryId,
    codeListId: match.codeListId,
    direction: match.direction,
  };
}

/**
 * The pick each column starts with from `dictionaryIds` alone: the code
 * list covering the most of its rows, else a description. A tie goes to
 * the dictionary earliest in `dictionaryIds`.
 */
export function pickDefaultsForColumns(
  options: Readonly<{
    columns: readonly ApplyColumnRef[];
    matchesByColumnName: MatchesByColumnName;
    dictionaryIds: readonly DataDictionary.Id[];
  }>,
): Record<string, ColumnPick> {
  const picks: Record<string, ColumnPick> = {};
  options.columns.forEach((column) => {
    const matches = (
      options.matchesByColumnName.get(column.name) ?? []
    ).flatMap((match) => {
      const rank = options.dictionaryIds.indexOf(match.dictionaryId);
      return rank === -1 ? [] : [{ ...match, dictionaryRank: rank }];
    });
    const match = DictionaryMatch.pickDefaultMatch(matches);
    if (match) {
      picks[column.id] = toColumnPick(match);
    }
  });
  return picks;
}

/**
 * The dictionaries that give at least one column a default pick, most
 * columns first, then in `dictionaries` order. The order never depends on
 * the order the columns arrived in.
 */
function _rankDictionariesByPicks(
  picks: Readonly<Record<string, ColumnPick>>,
  dictionaries: ReadonlyArray<{ id: DataDictionary.Id }>,
): DataDictionary.Id[] {
  const counts = new Map<DataDictionary.Id, number>();
  Object.values(picks).forEach((pick) => {
    counts.set(pick.dictionaryId, (counts.get(pick.dictionaryId) ?? 0) + 1);
  });
  return dictionaries
    .map((dictionary, index) => {
      return {
        id: dictionary.id,
        index,
        count: counts.get(dictionary.id) ?? 0,
      };
    })
    .filter((item) => {
      return item.count > 0;
    })
    .sort((itemA, itemB) => {
      return itemB.count - itemA.count || itemA.index - itemB.index;
    })
    .map((item) => {
      return item.id;
    });
}

/** Where `id` sits in `rankedIds`, with unranked ids last. */
function _rankOf(
  rankedIds: readonly DataDictionary.Id[],
  id: DataDictionary.Id,
): number {
  const rank = rankedIds.indexOf(id);
  return rank === -1 ? rankedIds.length : rank;
}

function _picksFromBindings(
  bindings: readonly DictionaryBinding.T[],
): Record<string, ColumnPick> {
  const picks: Record<string, ColumnPick> = {};
  bindings.forEach((binding) => {
    if (binding.dictionaryId && binding.entryId) {
      picks[binding.datasetColumnId] = {
        dictionaryId: binding.dictionaryId,
        entryId: binding.entryId,
        codeListId: binding.codeListId,
        direction: binding.direction,
      };
    }
  });
  return picks;
}

/**
 * The dictionaries and picks the apply flow opens with. A dataset that
 * already has bindings opens with them. A dictionary named when the flow
 * opened is the only one used for new picks. Otherwise every dictionary
 * that matches a column is used, ranked by how many columns it covers,
 * and a column two of them tie on goes to the higher ranked one.
 */
export function makeInitialSelection(
  options: Readonly<{
    columns: readonly ApplyColumnRef[];
    matchesByColumnName: MatchesByColumnName;
    existingBindings: readonly DictionaryBinding.T[];
    preselectedDictionaryId: DataDictionary.Id | undefined;
    dictionaries: ReadonlyArray<{ id: DataDictionary.Id }>;
  }>,
): { dictionaryIds: DataDictionary.Id[]; picks: Record<string, ColumnPick> } {
  const existing = _picksFromBindings(options.existingBindings);
  const existingIds = _rankDictionariesByPicks(existing, options.dictionaries);
  const newIds = options.preselectedDictionaryId
    ? [options.preselectedDictionaryId]
    : existingIds.length > 0
      ? []
      : options.dictionaries.map((dictionary) => {
          return dictionary.id;
        });
  const firstDefaults = pickDefaultsForColumns({
    ...options,
    dictionaryIds: newIds,
  });
  const rankedIds = _rankDictionariesByPicks(
    { ...firstDefaults, ...existing },
    options.dictionaries,
  );
  // Pick again in ranked order, so a tie goes to the dictionary shown first.
  // Re-picking only moves picks toward earlier dictionaries, so the ranking
  // still holds.
  const defaults = pickDefaultsForColumns({
    ...options,
    dictionaryIds: [...newIds].sort((idA, idB) => {
      return _rankOf(rankedIds, idA) - _rankOf(rankedIds, idB);
    }),
  });
  const picks = { ...defaults, ...existing };
  // A dictionary the user named stays in use even when nothing matched.
  const named = options.preselectedDictionaryId;
  const dictionaryIds =
    named && !rankedIds.includes(named) ? [...rankedIds, named] : rankedIds;
  return { dictionaryIds, picks };
}
