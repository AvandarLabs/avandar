import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type {
  DictionaryProposalEntry,
  DictionaryProposalSuggestionReason,
  DictionaryProposalT,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

/** A profile with what scoring reads from it worked out once. */
type Member = {
  /** Where the profile came in the input, which orders the entries. */
  index: number;
  match: ColumnProfile.MatchProfile;
  nameId: number;
};

type Cluster = {
  columns: [Member, ...Member[]];
  suggested: Member[];
  /** Every dataset a column or a guess in this cluster comes from. */
  datasetIds: Set<string>;
  /** The columns again, by name id, so a hopeless name is skipped once. */
  columnsByNameId: Map<number, Member[]>;
  suggestionReason: DictionaryProposalSuggestionReason | undefined;
};

/** How a column relates to a cluster: certainly the same, or a guess. */
type Outcome = "same" | DictionaryProposalSuggestionReason;

type Placement = { cluster: Cluster; outcome: Outcome; score: number };

const OUTCOME_RANK: Record<Outcome, number> = {
  same: 3,
  other_codes: 2,
  similar_name: 1,
  meaning: 1,
};

/** Breaks a tie between kinds: coded kinds first, plain text last. */
const KIND_PRIORITY: readonly DataDictionaryEntry.Kind[] = [
  "ordered",
  "categorical",
  "identifier",
  "date",
  "number",
  "text",
];

/**
 * The reason that says most about how sure the guess is: other codes over a
 * similar name or a meaning match. The first one wins a tie. Used when a
 * second guess joins an entry that already has a reason.
 */
export function getStrongerSuggestionReason(
  reasons: ReadonlyArray<DictionaryProposalSuggestionReason | undefined>,
): DictionaryProposalSuggestionReason | undefined {
  return reasons.reduce((strongest, reason) => {
    if (!reason) {
      return strongest;
    }
    return !strongest || OUTCOME_RANK[reason] > OUTCOME_RANK[strongest]
      ? reason
      : strongest;
  }, undefined);
}

function _getOutcome(match: ColumnProfile.MatchScore): Outcome | undefined {
  // The same name joins whatever the score: different codes become a
  // second code list on one entry, which the user can still keep apart.
  if (match.nameScore === 1) {
    return match.valueScore !== undefined && match.valueScore < 0.5
      ? "other_codes"
      : "same";
  }
  if (match.band === "match") {
    return "same";
  }
  return match.band === "suggestion" ? "similar_name" : undefined;
}

function _isBetter(
  candidate: Readonly<Placement>,
  current: Readonly<Placement> | undefined,
): boolean {
  if (!current) {
    return true;
  }
  const rankDifference =
    OUTCOME_RANK[candidate.outcome] - OUTCOME_RANK[current.outcome];
  return (
    rankDifference > 0 ||
    (rankDifference === 0 && candidate.score > current.score)
  );
}

/**
 * The better of `best` and how `member` relates to one cluster member.
 * Leaves the values uncompared when the name and type alone could not
 * reach `minimumScore`, or beat a certain match already found.
 */
function _getMemberPlacement(
  options: Readonly<{
    cluster: Cluster;
    clusterMember: Member;
    member: Member;
    best: Placement | undefined;
    search: PlacementSearch;
  }>,
): Placement | undefined {
  const { cluster, clusterMember, member, best, search } = options;
  const { nameScorer, minimumScore } = search;
  const nameScore = nameScorer.getScore(member.nameId, clusterMember.nameId);
  const typeScore = ColumnProfile.getTypeScore(
    member.match.profile.dataType,
    clusterMember.match.profile.dataType,
  );
  const bestPossible = ColumnProfile.getBestPossibleScore(nameScore, typeScore);
  const isHopeless =
    nameScore < 1 &&
    (bestPossible < minimumScore ||
      (best?.outcome === "same" && bestPossible <= best.score));
  if (isHopeless) {
    return best;
  }
  const match = ColumnProfile.getMatchScoreFromPrepared(
    clusterMember.match,
    member.match,
    nameScore,
  );
  const outcome = _getOutcome(match);
  const candidate = outcome
    ? { cluster, outcome, score: match.score }
    : undefined;
  return candidate && _isBetter(candidate, best) ? candidate : best;
}

/**
 * What a placement search scores with. A score below `minimumScore` can be
 * skipped unless the names are the same: `MATCH_SCORE` when only a certain
 * match is wanted, `SUGGESTION_SCORE` when a guess will do.
 */
type PlacementSearch = {
  nameScorer: ColumnProfile.NameScorer;
  minimumScore: number;
};

function _findPlacement(
  clusters: readonly Cluster[],
  member: Member,
  search: PlacementSearch,
): Placement | undefined {
  const datasetId = member.match.profile.datasetId;
  return clusters.reduce<Placement | undefined>((bestOfAll, cluster) => {
    // Two columns of one dataset are two different things, whatever they share.
    if (cluster.datasetIds.has(datasetId)) {
      return bestOfAll;
    }
    return [...cluster.columnsByNameId].reduce<Placement | undefined>(
      (bestOfName, [nameId, clusterMembers]) => {
        // No type can lift a name this far apart to the minimum score.
        const nameScore = search.nameScorer.getScore(member.nameId, nameId);
        const bestPossible = ColumnProfile.getBestPossibleScore(nameScore, 1);
        if (nameScore < 1 && bestPossible < search.minimumScore) {
          return bestOfName;
        }
        return clusterMembers.reduce<Placement | undefined>(
          (best, clusterMember) => {
            return _getMemberPlacement({
              cluster,
              clusterMember,
              member,
              best,
              search,
            });
          },
          bestOfName,
        );
      },
      bestOfAll,
    );
  }, undefined);
}

function _addToCluster(placement: Readonly<Placement>, member: Member): void {
  const { cluster, outcome } = placement;
  cluster.datasetIds.add(member.match.profile.datasetId);
  if (outcome === "same") {
    cluster.columns.push(member);
    cluster.columnsByNameId.set(member.nameId, [
      ...(cluster.columnsByNameId.get(member.nameId) ?? []),
      member,
    ]);
    return;
  }
  cluster.suggested.push(member);
  cluster.suggestionReason = getStrongerSuggestionReason([
    cluster.suggestionReason,
    outcome,
  ]);
}

function _createCluster(member: Member): Cluster {
  return {
    columns: [member],
    suggested: [],
    datasetIds: new Set([member.match.profile.datasetId]),
    columnsByNameId: new Map([[member.nameId, [member]]]),
    suggestionReason: undefined,
  };
}

/**
 * Orders members by dataset name, dataset id, and column name, so clustering
 * reads them in the same order however the profiles came in.
 */
function _compareMembers(memberA: Member, memberB: Member): number {
  const profileA = memberA.match.profile;
  const profileB = memberB.match.profile;
  const keysA = [profileA.datasetName, profileA.datasetId, profileA.columnName];
  const keysB = [profileB.datasetName, profileB.datasetId, profileB.columnName];
  const differentAt = keysA.findIndex((key, position) => {
    return key !== keysB[position];
  });
  if (differentAt === -1) {
    return memberA.index - memberB.index;
  }
  return (keysA[differentAt] ?? "") < (keysB[differentAt] ?? "") ? -1 : 1;
}

/**
 * Puts each member in the cluster it certainly matches best, or starts a
 * cluster of its own, so a later column of the same name can still find it.
 * Guesses are left for `_placeSingleColumns`.
 */
function _placeCertainMembers(
  members: readonly Member[],
  nameScorer: ColumnProfile.NameScorer,
): Cluster[] {
  return members.reduce<Cluster[]>((clusters, member) => {
    const placement = _findPlacement(clusters, member, {
      nameScorer,
      minimumScore: ColumnProfile.MATCH_SCORE,
    });
    if (placement?.outcome === "same") {
      _addToCluster(placement, member);
    } else {
      clusters.push(_createCluster(member));
    }
    return clusters;
  }, []);
}

/**
 * Moves each column that no certain match joined into the entry it matches
 * best, usually as a guess. It looks at the entries of several columns and
 * at the single columns ordered before it by `_compareMembers`, so of two
 * single columns the one in the dataset first by name keeps the entry.
 * Returns the clusters that are left.
 */
function _placeSingleColumns(
  clusters: readonly Cluster[],
  nameScorer: ColumnProfile.NameScorer,
): Cluster[] {
  const isMultiColumn = clusters.map((cluster) => {
    return cluster.columns.length > 1;
  });
  const movedClusters = new Set<Cluster>();
  clusters.forEach((cluster, position) => {
    if (isMultiColumn[position]) {
      return;
    }
    const candidates = clusters.filter((candidate, candidatePosition) => {
      return (
        !movedClusters.has(candidate) &&
        (isMultiColumn[candidatePosition] || candidatePosition < position)
      );
    });
    const placement = _findPlacement(candidates, cluster.columns[0], {
      nameScorer,
      minimumScore: ColumnProfile.SUGGESTION_SCORE,
    });
    if (placement) {
      _addToCluster(placement, cluster.columns[0]);
      movedClusters.add(cluster);
    }
  });
  return clusters.filter((cluster) => {
    return !movedClusters.has(cluster);
  });
}

/** The entry name most of the columns would get, the first read on a tie. */
function _getMostCommonName(columns: readonly Member[]): string {
  const counts = new Map<string, number>();
  columns.forEach((column) => {
    const name = ColumnProfile.getEntryNameFromColumnName(
      column.match.profile.columnName,
    );
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return [...counts.entries()].reduce(
    (bestName, [name, count]) => {
      return count > (counts.get(bestName) ?? 0) ? name : bestName;
    },
    ColumnProfile.getEntryNameFromColumnName(
      columns[0]?.match.profile.columnName ?? "",
    ),
  );
}

/**
 * `name`, or `name_2`, `name_3`, and so on: the first one no taken name
 * uses, ignoring case.
 */
function _getFirstFreeName(
  name: string,
  takenNames: ReadonlySet<string>,
): string {
  // One more candidate than there are taken names, so one is always free.
  const candidates = Array.from(
    { length: takenNames.size + 1 },
    (_item, index) => {
      return index === 0 ? name : `${name}_${index + 1}`;
    },
  );
  return (
    candidates.find((candidate) => {
      return !takenNames.has(candidate.toLowerCase());
    }) ?? name
  );
}

function _getMostCommonKind(
  columns: readonly ColumnProfile.T[],
): DataDictionaryEntry.Kind {
  const counts = new Map<DataDictionaryEntry.Kind, number>();
  columns.forEach((column) => {
    const kind = ColumnProfile.getEntryKind(column);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
  });
  // `sort` is stable, so a tie keeps the order of KIND_PRIORITY.
  const [mostCommon] = [...KIND_PRIORITY].sort((kindA, kindB) => {
    return (counts.get(kindB) ?? 0) - (counts.get(kindA) ?? 0);
  });
  return mostCommon ?? "text";
}

function _sortByInputOrder(members: readonly Member[]): Member[] {
  return [...members].sort((memberA, memberB) => {
    return memberA.index - memberB.index;
  });
}

/** Where the cluster's first column or guess came in the input. */
function _getFirstIndex(cluster: Readonly<Cluster>): number {
  return Math.min(
    ...[...cluster.columns, ...cluster.suggested].map((member) => {
      return member.index;
    }),
  );
}

/**
 * The entry for one cluster. Its `key` is built from the first member in
 * input order, so the same profiles in a different order key their entries
 * differently, while a proposal's edits only ever use the keys it holds.
 */
function _makeEntryFromCluster(
  cluster: Readonly<Cluster>,
): DictionaryProposalEntry {
  // Clustering reads columns in a fixed order, but the entry lists them, and
  // breaks a name tie, in the order they came in.
  const orderedColumns = _sortByInputOrder(cluster.columns);
  const first = orderedColumns[0] ?? cluster.columns[0];
  const columns = orderedColumns.map((member) => {
    return member.match.profile;
  });
  const suggestedColumns = _sortByInputOrder(cluster.suggested).map(
    (member) => {
      return member.match.profile;
    },
  );
  return {
    key: `${first.match.profile.datasetId}:${first.match.profile.columnName}`,
    name: _getMostCommonName(orderedColumns),
    columns,
    suggestedColumns,
    suggestionReason: cluster.suggestionReason,
    kind: _getMostCommonKind([...columns, ...suggestedColumns]),
    isIncluded: true,
    description: "",
    isDescriptionSuggested: false,
  };
}

function _prepareMembers(
  profiles: readonly ColumnProfile.T[],
  nameScorer: ColumnProfile.NameScorer,
): Member[] {
  // Every name gets its id before any scoring, so score rows are sized once.
  return profiles.map((profile, index) => {
    return {
      index,
      match: ColumnProfile.prepareProfileForMatching(profile),
      nameId: nameScorer.getNameId(profile.columnName),
    };
  });
}

/**
 * Groups profiled columns from one or more datasets into the entries a new
 * dictionary would have. A column joins the entry it matches best: by the
 * same name, or by a match score of 0.9 or more. A column nothing certainly
 * matches can join an entry as a guess the user can undo: by a weaker match
 * (0.6 to 0.9), or by the same name with other codes. Two columns of one
 * dataset never share an entry. The grouping does not depend on the order
 * of `profiles`. That order only sets the order of the entries and, on a
 * tie, their names: each entry is named after its most common column name
 * in lowercase words (`GENDER` gives `gender`), the first read on a tie,
 * with `_2` added when an earlier entry, or one of `takenNames`, already has
 * that name.
 *
 * Used when a dictionary is created from datasets, and again by Keep apart
 * to regroup the columns a guess had joined.
 */
export function makeProposalFromColumnProfiles(
  profiles: readonly ColumnProfile.T[],
  options: Readonly<{ takenNames?: readonly string[] }> = {},
): DictionaryProposalT {
  const nameScorer = ColumnProfile.createNameScorer();
  const members = _prepareMembers(profiles, nameScorer).sort(_compareMembers);
  // Certain matches are placed first, so a guess never takes the dataset
  // slot a certain match needed. The guesses are placed second.
  const clusters = _placeSingleColumns(
    _placeCertainMembers(members, nameScorer),
    nameScorer,
  );
  const takenNames = new Set(
    (options.takenNames ?? []).map((name) => {
      return name.trim().toLowerCase();
    }),
  );
  const orderedClusters = [...clusters].sort((clusterA, clusterB) => {
    return _getFirstIndex(clusterA) - _getFirstIndex(clusterB);
  });
  return {
    entries: orderedClusters.map((cluster) => {
      const entry = _makeEntryFromCluster(cluster);
      const name = _getFirstFreeName(entry.name, takenNames);
      takenNames.add(name.toLowerCase());
      return { ...entry, name };
    }),
  };
}
