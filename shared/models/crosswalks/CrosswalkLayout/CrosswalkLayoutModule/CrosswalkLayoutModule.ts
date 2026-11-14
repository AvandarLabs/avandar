import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import { fnv1a64Hex } from "$/utils/fnv1a64Hex/fnv1a64Hex.ts";
import type {
  CrosswalkLayoutDataset,
  CrosswalkLayoutGroup,
  CrosswalkLayoutId,
} from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout.types.ts";

/** Separates column names in a layout key; no column name contains it. */
const KEY_SEPARATOR = "\u001f";

/** The layout key format `buildSignature` hashes. */
const SIGNATURE_PREFIX = "l1.";

/** `findMostSimilarLayout`'s default: half the names in common. */
const DEFAULT_MIN_OVERLAP = 0.5;

/** A locale-free order, so the same names sort the same everywhere. */
function _compareCodePoints(textA: string, textB: string): number {
  if (textA === textB) {
    return 0;
  }
  return textA < textB ? -1 : 1;
}

function _normalizeColumnName(columnName: string): string {
  return columnName.toLowerCase();
}

function _getNormalizedNames(columnNames: readonly string[]): string[] {
  return [...new Set(columnNames.map(_normalizeColumnName))];
}

/**
 * The key two datasets share when they have the same columns: the names
 * trimmed, lowercased, each once, sorted, and joined. Column order and case
 * never change it, so `CaseNo` and `caseno ` share one.
 */
function buildLayoutKey(columnNames: readonly string[]): string {
  return _getNormalizedNames(columnNames)
    .sort(_compareCodePoints)
    .join(KEY_SEPARATOR);
}

/** A short, stable hash of a layout's key, unique per crosswalk. */
function buildSignature(columnNames: readonly string[]): string {
  return `${SIGNATURE_PREFIX}${fnv1a64Hex(buildLayoutKey(columnNames))}`;
}

function _compareDatasets(
  datasetA: Readonly<CrosswalkLayoutDataset>,
  datasetB: Readonly<CrosswalkLayoutDataset>,
): number {
  return (
    _compareCodePoints(datasetA.name, datasetB.name) ||
    _compareCodePoints(datasetA.id, datasetB.id)
  );
}

function _getColumnNames(dataset: Readonly<CrosswalkLayoutDataset>): string[] {
  return dataset.columns.map((column) => {
    return column.name;
  });
}

/** A group of datasets sorted by name, named after its first dataset. */
function _toGroup(
  key: string,
  sortedDatasets: readonly CrosswalkLayoutDataset[],
): CrosswalkLayoutGroup {
  const columnNames = sortedDatasets[0]
    ? _getColumnNames(sortedDatasets[0])
    : [];
  return {
    key,
    signature: buildSignature(columnNames),
    columnNames,
    datasetIds: sortedDatasets.map((dataset) => {
      return dataset.id;
    }),
  };
}

/**
 * Groups datasets that share one set of column names, most datasets first,
 * then by the first dataset's name. Each group is named and ordered by its
 * datasets' names.
 */
function groupDatasetsByLayout(
  datasets: readonly CrosswalkLayoutDataset[],
): CrosswalkLayoutGroup[] {
  const datasetsByKey = new Map<string, CrosswalkLayoutDataset[]>();
  datasets.forEach((dataset) => {
    const key = buildLayoutKey(_getColumnNames(dataset));
    datasetsByKey.set(key, [...(datasetsByKey.get(key) ?? []), dataset]);
  });
  return [...datasetsByKey.entries()]
    .map(([key, groupDatasets]) => {
      const sorted = [...groupDatasets].sort(_compareDatasets);
      return { group: _toGroup(key, sorted), firstName: sorted[0]?.name ?? "" };
    })
    .sort((rankA, rankB) => {
      return (
        rankB.group.datasetIds.length - rankA.group.datasetIds.length ||
        _compareCodePoints(rankA.firstName, rankB.firstName) ||
        _compareCodePoints(rankA.group.key, rankB.group.key)
      );
    })
    .map((rank) => {
      return rank.group;
    });
}

type NameScorer = ReturnType<typeof ColumnProfile.createNameScorer>;

function _isCovered(
  columnName: string,
  candidateNames: readonly string[],
  scorer: NameScorer,
): boolean {
  const normalizedName = _normalizeColumnName(columnName);
  const columnId = scorer.getNameId(columnName);
  return candidateNames.some((candidateName) => {
    return (
      _normalizeColumnName(candidateName) === normalizedName ||
      scorer.getScore(scorer.getNameId(candidateName), columnId) >=
        ColumnProfile.MATCH_SCORE
    );
  });
}

type CoverageOptions = Readonly<{
  candidate: readonly string[];
  others: ReadonlyArray<{
    columnNames: readonly string[];
    datasetCount: number;
  }>;
}>;

function _getCoverageWith(
  options: CoverageOptions,
  scorer: NameScorer,
): { matchedCount: number; totalCount: number } {
  return options.others.reduce(
    (counts, other) => {
      const matchedNames = other.columnNames.filter((columnName) => {
        return _isCovered(columnName, options.candidate, scorer);
      });
      return {
        matchedCount:
          counts.matchedCount + matchedNames.length * other.datasetCount,
        totalCount:
          counts.totalCount + other.columnNames.length * other.datasetCount,
      };
    },
    { matchedCount: 0, totalCount: 0 },
  );
}

/**
 * How many of the other layouts' columns a candidate layout's columns
 * cover, each weighted by how many datasets have it. A column is covered
 * when a candidate column has the same name, ignoring case, or a name
 * score of at least `ColumnProfile.MATCH_SCORE`, so `zip` covers `zip_code`.
 */
function getCoverage(options: CoverageOptions): {
  matchedCount: number;
  totalCount: number;
} {
  return _getCoverageWith(options, ColumnProfile.createNameScorer());
}

function _getCoverageShare(
  group: Readonly<CrosswalkLayoutGroup>,
  groups: readonly CrosswalkLayoutGroup[],
  scorer: NameScorer,
): number {
  const { matchedCount, totalCount } = _getCoverageWith(
    {
      candidate: group.columnNames,
      others: groups
        .filter((other) => {
          return other.key !== group.key;
        })
        .map((other) => {
          return {
            columnNames: other.columnNames,
            datasetCount: other.datasetIds.length,
          };
        }),
    },
    scorer,
  );
  return totalCount === 0 ? 1 : matchedCount / totalCount;
}

/**
 * The key of the layout that makes the best reference: the one covering
 * the largest share of the other layouts' columns, then the one with the
 * most datasets, then the most columns, then the lowest key. Undefined when
 * there are no layouts.
 */
function chooseReferenceLayout(
  groups: readonly CrosswalkLayoutGroup[],
): string | undefined {
  // One scorer for every pair of layouts, so each pair of names is scored once.
  const scorer = ColumnProfile.createNameScorer();
  const ranked = groups
    .map((group) => {
      return { group, share: _getCoverageShare(group, groups, scorer) };
    })
    .sort((rankA, rankB) => {
      return (
        rankB.share - rankA.share ||
        rankB.group.datasetIds.length - rankA.group.datasetIds.length ||
        rankB.group.columnNames.length - rankA.group.columnNames.length ||
        _compareCodePoints(rankA.group.key, rankB.group.key)
      );
    });
  return ranked[0]?.group.key;
}

/**
 * How alike two layouts' column names are, from 0 to 1: the names they
 * share, ignoring case, over the names either has.
 */
function getNameOverlap(
  namesA: readonly string[],
  namesB: readonly string[],
): number {
  const setA = new Set(_getNormalizedNames(namesA));
  const setB = new Set(_getNormalizedNames(namesB));
  const sharedCount = [...setA].filter((name) => {
    return setB.has(name);
  }).length;
  const unionCount = setA.size + setB.size - sharedCount;
  return unionCount === 0 ? 0 : sharedCount / unionCount;
}

/**
 * The candidate layout whose column names overlap these the most, at
 * least `minOverlap` (half by default). The first candidate wins a tie.
 * Undefined when none overlaps enough.
 */
function findMostSimilarLayout(
  options: Readonly<{
    columnNames: readonly string[];
    candidates: ReadonlyArray<{
      id: CrosswalkLayoutId;
      columnNames: readonly string[];
    }>;
    minOverlap?: number;
  }>,
): CrosswalkLayoutId | undefined {
  const minOverlap = options.minOverlap ?? DEFAULT_MIN_OVERLAP;
  const best = options.candidates.reduce<
    { id: CrosswalkLayoutId; overlap: number } | undefined
  >((current, candidate) => {
    const overlap = getNameOverlap(options.columnNames, candidate.columnNames);
    return overlap >= minOverlap && overlap > (current?.overlap ?? -1)
      ? { id: candidate.id, overlap }
      : current;
  }, undefined);
  return best?.id;
}

/** Whether a dataset's current columns no longer match its layout's key. */
function hasColumnsChanged(
  options: Readonly<{
    layoutKey: string;
    currentColumnNames: readonly string[];
  }>,
): boolean {
  return buildLayoutKey(options.currentColumnNames) !== options.layoutKey;
}

/**
 * The status a layout that is neither mapped nor skipped takes after its
 * fills change: `review` once every column has a fill, `to_do` before then
 * and while there are no columns.
 */
function getStatusAfterFill(
  options: Readonly<{
    columnIds: readonly string[];
    filledColumnIds: ReadonlySet<string>;
  }>,
): "to_do" | "review" {
  const isEveryColumnFilled =
    options.columnIds.length > 0 &&
    options.columnIds.every((columnId) => {
      return options.filledColumnIds.has(columnId);
    });
  return isEveryColumnFilled ? "review" : "to_do";
}

/**
 * Pure helpers for a crosswalk's layouts: the key and signature datasets
 * with the same columns share, grouping datasets into layouts, choosing the
 * reference layout, and finding the layout a new one is most like. Use it,
 * for example, to group a crosswalk's datasets or to tell whether a
 * dataset's columns changed since it was grouped.
 */
export const CrosswalkLayoutModule = {
  buildLayoutKey,
  buildSignature,
  groupDatasetsByLayout,
  getCoverage,
  chooseReferenceLayout,
  getNameOverlap,
  findMostSimilarLayout,
  hasColumnsChanged,
  getStatusAfterFill,
};
