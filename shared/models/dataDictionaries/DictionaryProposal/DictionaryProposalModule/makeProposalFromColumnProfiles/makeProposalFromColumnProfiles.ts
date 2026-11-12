import { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile.ts";
import type { DataDictionaryEntry } from "$/models/dataDictionaries/DataDictionaryEntry/DataDictionaryEntry.ts";
import type {
  DictionaryProposalEntry,
  DictionaryProposalSuggestionReason,
  DictionaryProposalT,
} from "$/models/dataDictionaries/DictionaryProposal/DictionaryProposal.types.ts";

type ProfileList = [ColumnProfile.T, ...ColumnProfile.T[]];

type Cluster = {
  columns: ProfileList;
  suggestedColumns: ColumnProfile.T[];
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

function _getPlacementInCluster(
  cluster: Cluster,
  profile: ColumnProfile.T,
): Placement | undefined {
  const members = [...cluster.columns, ...cluster.suggestedColumns];
  // Two columns of one dataset are two different things, whatever they share.
  const hasDataset = members.some((member) => {
    return member.datasetId === profile.datasetId;
  });
  if (hasDataset) {
    return undefined;
  }
  return cluster.columns.reduce<Placement | undefined>((best, member) => {
    const match = ColumnProfile.getMatchScore(member, profile);
    const outcome = _getOutcome(match);
    const candidate = outcome
      ? { cluster, outcome, score: match.score }
      : undefined;
    return candidate && _isBetter(candidate, best) ? candidate : best;
  }, undefined);
}

function _findPlacement(
  clusters: readonly Cluster[],
  profile: ColumnProfile.T,
): Placement | undefined {
  return clusters.reduce<Placement | undefined>((best, cluster) => {
    const candidate = _getPlacementInCluster(cluster, profile);
    return candidate && _isBetter(candidate, best) ? candidate : best;
  }, undefined);
}

/** The entry name most of the columns would get, the first read on a tie. */
function _getMostCommonName(columns: Readonly<ProfileList>): string {
  const counts = new Map<string, number>();
  columns.forEach((column) => {
    const name = ColumnProfile.getEntryNameFromColumnName(column.columnName);
    counts.set(name, (counts.get(name) ?? 0) + 1);
  });
  return [...counts.entries()].reduce((bestName, [name, count]) => {
    return count > (counts.get(bestName) ?? 0) ? name : bestName;
  }, ColumnProfile.getEntryNameFromColumnName(columns[0].columnName));
}

/**
 * `name`, or `name_2`, `name_3`, and so on: the first one no taken name
 * uses, ignoring case. Records the one it returns as taken.
 */
function _takeUniqueName(name: string, takenNames: Set<string>): string {
  let candidate = name;
  let suffix = 2;
  while (takenNames.has(candidate.toLowerCase())) {
    candidate = `${name}_${suffix}`;
    suffix += 1;
  }
  takenNames.add(candidate.toLowerCase());
  return candidate;
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
  return {
    key: `${first.datasetId}:${first.columnName}`,
    name: _getMostCommonName(cluster.columns),
    columns: [...cluster.columns],
    suggestedColumns: [...cluster.suggestedColumns],
    suggestionReason: cluster.suggestionReason,
    kind: _getMostCommonKind([...cluster.columns, ...cluster.suggestedColumns]),
    isIncluded: true,
    description: "",
    isDescriptionSuggested: false,
  };
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
  const clusters: Cluster[] = [];
  profiles.forEach((profile) => {
    const placement = _findPlacement(clusters, profile);
    if (!placement) {
      clusters.push({
        columns: [profile],
        suggestedColumns: [],
        suggestionReason: undefined,
      });
    } else if (placement.outcome === "same") {
      placement.cluster.columns.push(profile);
    } else {
      placement.cluster.suggestedColumns.push(profile);
      placement.cluster.suggestionReason = placement.outcome;
    }
  });
  const takenNames = new Set(
    (options.takenNames ?? []).map((name) => {
      return name.trim().toLowerCase();
    }),
  );
  return {
    entries: clusters.map((cluster) => {
      const entry = _makeEntryFromCluster(cluster);
      return { ...entry, name: _takeUniqueName(entry.name, takenNames) };
    }),
  };
}
