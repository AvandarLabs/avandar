import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary.ts";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type { DataDictionaryEntryCoding } from "$/models/dataDictionaries/DataDictionaryEntryCoding/DataDictionaryEntryCoding.ts";
import type {
  DictionaryMatchEntry,
  DictionaryMatchT,
} from "$/models/dataDictionaries/DictionaryMatch/DictionaryMatch.types.ts";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType.ts";

/** A code list fits a column when it covers at least this share of rows. */
const FITS_SHARE = 0.5;

type ListCoverage = {
  codeListId: DataDictionaryCodeList.Id;
  codeListName: string;
  coverage: number | undefined;
  direction: DictionaryMatchT["direction"];
};

/** Orders two ids by code unit, so the order never depends on locale. */
function _compareIds(idA: string, idB: string): number {
  if (idA === idB) {
    return 0;
  }
  return idA < idB ? -1 : 1;
}

/** How well a column's data type suits an entry's kind: 1, 0.5, or 0. */
function _getKindTypeScore(
  kind: DataDictionaryEntry.Kind,
  dataType: AvaDataType.T,
): number {
  const expected =
    kind === "number"
      ? ["bigint", "double"]
      : kind === "date"
        ? ["date", "timestamp"]
        : undefined;
  if (!expected || expected.includes(dataType)) {
    return 1;
  }
  return dataType === "varchar" ? 0.5 : 0;
}

function _getEntryNameScore(
  columnName: string,
  entry: Readonly<DictionaryMatchEntry>,
): number {
  return Math.max(
    ...[entry.entryName, ...entry.columnNames].map((name) => {
      return ColumnProfile.getNameScore(columnName, name);
    }),
  );
}

/** The share of a profiled column's rows whose value is one of `keys`. */
function _getCoverage(
  profile: Readonly<ColumnProfile.T>,
  keys: ReadonlySet<string>,
): number | undefined {
  if (!profile.values) {
    return undefined;
  }
  let totalRows = 0;
  let coveredRows = 0;
  profile.values.forEach((item) => {
    totalRows += item.rowCount;
    if (keys.has(ColumnProfile.getComparisonKey(item.value))) {
      coveredRows += item.rowCount;
    }
  });
  return totalRows === 0 ? undefined : coveredRows / totalRows;
}

function _getListCoverages(
  profile: Readonly<ColumnProfile.T>,
  list: DictionaryMatchEntry["codeLists"][number],
): ListCoverage[] {
  const codeKeys = new Set(
    list.pairs.map((pair) => {
      return ColumnProfile.getComparisonKey(pair.code);
    }),
  );
  const labelKeys = new Set(
    list.pairs
      .flatMap((pair) => {
        return [pair.label, ...pair.acceptedSpellings];
      })
      .filter((spelling) => {
        return spelling.trim() !== "";
      })
      .map(ColumnProfile.getComparisonKey),
  );
  const base = { codeListId: list.id, codeListName: list.name };
  return [
    { ...base, coverage: _getCoverage(profile, codeKeys), direction: "decode" },
    {
      ...base,
      coverage: _getCoverage(profile, labelKeys),
      direction: "encode",
    },
  ];
}

/**
 * The list and direction covering the most rows. The first best wins, so
 * the primary list beats an equal one and codes beat labels on a tie.
 */
function _getBestCoverage(
  profile: Readonly<ColumnProfile.T>,
  entry: Readonly<DictionaryMatchEntry>,
): ListCoverage | undefined {
  return entry.codeLists
    .flatMap((list) => {
      return _getListCoverages(profile, list);
    })
    .reduce<ListCoverage | undefined>((best, candidate) => {
      return best && (candidate.coverage ?? -1) <= (best.coverage ?? -1)
        ? best
        : candidate;
    }, undefined);
}

/** Name 0.45, type 0.2, values 0.35, rescaled when values are unknown. */
function _getScore(
  nameScore: number,
  typeScore: number,
  coverage: number | undefined,
): number {
  const weighted = 0.45 * nameScore + 0.2 * typeScore;
  return coverage === undefined ? weighted / 0.65 : weighted + 0.35 * coverage;
}

/**
 * How well one entry matches one profiled column, or undefined below the
 * suggestion score. An entry with codes whose values could not be compared
 * with the column's, because the column has too many values to list or none
 * at all, matches as a description and ranks below every compared match.
 */
function getEntryMatch(
  profile: Readonly<ColumnProfile.T>,
  entry: Readonly<DictionaryMatchEntry>,
): DictionaryMatchT | undefined {
  const best = _getBestCoverage(profile, entry);
  const compared = best?.coverage === undefined ? undefined : best;
  const score = _getScore(
    _getEntryNameScore(profile.columnName, entry),
    _getKindTypeScore(entry.kind, profile.dataType),
    compared?.coverage,
  );
  if (score < ColumnProfile.SUGGESTION_SCORE) {
    return undefined;
  }
  const coverage = compared?.coverage;
  const isUncompared = best !== undefined && compared === undefined;
  return {
    dictionaryId: entry.dictionaryId,
    dictionaryRank: entry.dictionaryRank,
    entryId: entry.entryId,
    entryName: entry.entryName,
    position: entry.position,
    codeListId: compared?.codeListId,
    codeListName: compared?.codeListName,
    coverage,
    direction: compared?.direction ?? "decode",
    fit:
      coverage === undefined
        ? "description"
        : coverage >= FITS_SHARE
          ? "fits"
          : "values_dont_fit",
    // Every compared match scores at least the suggestion score, so scaling
    // below it keeps an uncompared list from outranking a real comparison.
    score: isUncompared ? score * ColumnProfile.SUGGESTION_SCORE : score,
  };
}

/**
 * Orders matches best first: score, then coverage, then the dictionary's
 * place in the list, then the entry's place in its dictionary, then id. The
 * order never depends on the order the inputs arrived in.
 */
function compareMatches(
  matchA: Readonly<DictionaryMatchT>,
  matchB: Readonly<DictionaryMatchT>,
): number {
  return (
    matchB.score - matchA.score ||
    (matchB.coverage ?? -1) - (matchA.coverage ?? -1) ||
    matchA.dictionaryRank - matchB.dictionaryRank ||
    matchA.position - matchB.position ||
    _compareIds(matchA.entryId, matchB.entryId)
  );
}

/** Every entry that matches each profiled column, best first, by name. */
function findColumnMatches(
  profiles: readonly ColumnProfile.T[],
  entries: readonly DictionaryMatchEntry[],
): Map<string, DictionaryMatchT[]> {
  return new Map(
    profiles.map((profile) => {
      const matches = entries
        .flatMap((entry) => {
          const match = getEntryMatch(profile, entry);
          return match ? [match] : [];
        })
        .sort(compareMatches);
      return [profile.columnName, matches] as const;
    }),
  );
}

/**
 * The match a column starts with: the code list covering the most of its
 * rows, else the best description-only entry. A list whose values do not
 * fit is never picked for the user. The result never depends on the order
 * of `matches`.
 */
function pickDefaultMatch(
  matches: readonly DictionaryMatchT[],
): DictionaryMatchT | undefined {
  const sorted = [...matches].sort(compareMatches);
  const fitting = sorted
    .filter((match) => {
      return match.fit === "fits";
    })
    .sort((matchA, matchB) => {
      return (
        (matchB.coverage ?? 0) - (matchA.coverage ?? 0) ||
        compareMatches(matchA, matchB)
      );
    });
  return (
    fitting[0] ??
    sorted.find((match) => {
      return match.fit === "description";
    })
  );
}

/**
 * Builds the entries of `dictionaries` for matching, in that order. Each
 * entry's code lists come from its codings, primary first.
 */
function toMatchEntries(
  options: Readonly<{
    dictionaries: ReadonlyArray<{ id: DataDictionary.Id }>;
    entries: readonly DataDictionaryEntry.T[];
    codeLists: readonly DataDictionaryCodeList.T[];
    codings: readonly DataDictionaryEntryCoding.T[];
  }>,
): DictionaryMatchEntry[] {
  const rankById = new Map(
    options.dictionaries.map((dictionary, index) => {
      return [dictionary.id, index] as const;
    }),
  );
  const listsById = new Map(
    options.codeLists.map((list) => {
      return [list.id, list] as const;
    }),
  );
  return options.entries.flatMap((entry) => {
    const rank = rankById.get(entry.dictionaryId);
    return rank === undefined
      ? []
      : [_toMatchEntry({ entry, rank, listsById, codings: options.codings })];
  });
}

function _toMatchEntry(
  options: Readonly<{
    entry: DataDictionaryEntry.T;
    rank: number;
    listsById: ReadonlyMap<DataDictionaryCodeList.Id, DataDictionaryCodeList.T>;
    codings: readonly DataDictionaryEntryCoding.T[];
  }>,
): DictionaryMatchEntry {
  const { entry } = options;
  const codeLists = options.codings
    .filter((coding) => {
      return coding.entryId === entry.id;
    })
    .sort((codingA, codingB) => {
      return (
        Number(codingB.isPrimary) - Number(codingA.isPrimary) ||
        _compareIds(codingA.codeListId, codingB.codeListId)
      );
    })
    .flatMap((coding) => {
      const list = options.listsById.get(coding.codeListId);
      return list ? [{ id: list.id, name: list.name, pairs: list.pairs }] : [];
    });
  return {
    dictionaryId: entry.dictionaryId,
    dictionaryRank: options.rank,
    entryId: entry.id,
    entryName: entry.name,
    columnNames: entry.columnNames,
    kind: entry.kind,
    position: entry.position,
    codeLists,
  };
}

/**
 * Pure helpers for matching dataset columns to dictionary entries when a
 * dictionary is applied: how well each entry fits each profiled column,
 * which code list and direction fit best, and the match a column starts
 * with. Runs on the device from column profiles, so it works offline.
 */
export const DictionaryMatchModule = {
  FITS_SHARE,
  toMatchEntries,
  getEntryMatch,
  findColumnMatches,
  compareMatches,
  pickDefaultMatch,
};
