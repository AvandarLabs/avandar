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
  firstIndex: number;
  columns: [Member, ...Member[]];
  suggested: Member[];
  /** Every dataset a column or a guess in this cluster comes from. */
  datasetIds: Set<string>;
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
 * reach a suggestion, or beat a certain match already found.
 */
function _getMemberPlacement(
  options: Readonly<{
    cluster: Cluster;
    clusterMember: Member;
    member: Member;
    best: Placement | undefined;
    nameScorer: ColumnProfile.NameScorer;
  }>,
): Placement | undefined {
  const { cluster, clusterMember, member, best, nameScorer } = options;
  const nameScore = nameScorer.getScore(member.nameId, clusterMember.nameId);
  const typeScore = ColumnProfile.getTypeScore(
    member.match.profile.dataType,
    clusterMember.match.profile.dataType,
  );
  const bestPossible = ColumnProfile.getBestPossibleScore(nameScore, typeScore);
  const isHopeless =
    nameScore < 1 &&
    (bestPossible < ColumnProfile.SUGGESTION_SCORE ||
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

function _findPlacement(
  clusters: readonly Cluster[],
  member: Member,
  nameScorer: ColumnProfile.NameScorer,
): Placement | undefined {
  const datasetId = member.match.profile.datasetId;
  return clusters.reduce<Placement | undefined>((bestOfAll, cluster) => {
    // Two columns of one dataset are two different things, whatever they share.
    if (cluster.datasetIds.has(datasetId)) {
      return bestOfAll;
    }
    return cluster.columns.reduce<Placement | undefined>(
      (best, clusterMember) => {
        return _getMemberPlacement({
          cluster,
          clusterMember,
          member,
          best,
          nameScorer,
        });
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
    firstIndex: member.index,
    columns: [member],
    suggested: [],
    datasetIds: new Set([member.match.profile.datasetId]),
    suggestionReason: undefined,
  };
}

/** A column whose best match is a guess, with the cluster it would join. */
type DeferredGuess = { member: Member; placement: Placement };

/**
 * Places each member in the cluster it matches best, or starts a new one.
 * A member whose best match is only a guess is returned instead, so every
 * certain match is placed before any guess is.
 */
function _placeCertainMembers(
  members: readonly Member[],
  clusters: Cluster[],
  nameScorer: ColumnProfile.NameScorer,
): DeferredGuess[] {
  return members.flatMap((member) => {
    const placement = _findPlacement(clusters, member, nameScorer);
    if (!placement) {
      clusters.push(_createCluster(member));
    } else if (placement.outcome === "same") {
      _addToCluster(placement, member);
    } else {
      return [{ member, placement }];
    }
    return [];
  });
}

/**
 * Places the guesses found earlier. A guess keeps its cluster unless that
 * cluster has since taken a column from the same dataset, and then it looks
 * again, as a certain match or a new entry of its own.
 */
function _placeGuesses(
  guesses: readonly DeferredGuess[],
  clusters: Cluster[],
  nameScorer: ColumnProfile.NameScorer,
): void {
  guesses.forEach(({ member, placement }) => {
    const isTaken = placement.cluster.datasetIds.has(
      member.match.profile.datasetId,
    );
    const current = isTaken
      ? _findPlacement(clusters, member, nameScorer)
      : placement;
    if (current) {
      _addToCluster(current, member);
    } else {
      clusters.push(_createCluster(member));
    }
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

function _makeEntryFromCluster(
  cluster: Readonly<Cluster>,
): DictionaryProposalEntry {
  const [first] = cluster.columns;
  const columns = cluster.columns.map((member) => {
    return member.match.profile;
  });
  const suggestedColumns = cluster.suggested.map((member) => {
    return member.match.profile;
  });
  return {
    key: `${first.match.profile.datasetId}:${first.match.profile.columnName}`,
    name: _getMostCommonName(cluster.columns),
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
 * same name, or by a match score of 0.9 or more. A weaker match (0.6 to
 * 0.9) or the same name with other codes joins as a guess the user can
 * undo. Two columns of one dataset never share an entry. Each entry is named
 * after its most common column name in lowercase words (`GENDER` gives
 * `gender`), with `_2` added when another entry, or one of `takenNames`,
 * already has that name.
 *
 * Used when a dictionary is created from datasets, and again by Keep apart
 * to regroup the columns a guess had joined.
 */
export function makeProposalFromColumnProfiles(
  profiles: readonly ColumnProfile.T[],
  options: Readonly<{ takenNames?: readonly string[] }> = {},
): DictionaryProposalT {
  const nameScorer = ColumnProfile.createNameScorer();
  const members = _prepareMembers(profiles, nameScorer);
  const clusters: Cluster[] = [];
  // Certain matches are placed first, so a guess never takes the dataset
  // slot a certain match needed. The guesses are placed second.
  const guesses = _placeCertainMembers(members, clusters, nameScorer);
  _placeGuesses(guesses, clusters, nameScorer);
  const takenNames = new Set(
    (options.takenNames ?? []).map((name) => {
      return name.trim().toLowerCase();
    }),
  );
  const orderedClusters = [...clusters].sort((clusterA, clusterB) => {
    return clusterA.firstIndex - clusterB.firstIndex;
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
