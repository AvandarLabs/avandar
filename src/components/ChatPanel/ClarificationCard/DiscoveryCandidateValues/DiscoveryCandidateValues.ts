import { removeDuplicates } from "@/lib/utils/arrays/removeDuplicates/removeDuplicates";

function _normalize(candidateValue: string): string {
  return candidateValue.normalize("NFKC").trim().toLowerCase();
}

function _getUniqueMatch(
  options: Readonly<{
    candidateValues: readonly string[];
    discoveredValues: readonly string[];
  }>,
): string | undefined {
  const normalizedCandidates = new Set(
    options.candidateValues.map(_normalize).filter((candidateValue) => {
      return candidateValue.length > 0;
    }),
  );
  const matchingValues = removeDuplicates(options.discoveredValues).filter(
    (discoveredValue) => {
      return normalizedCandidates.has(_normalize(discoveredValue));
    },
  );

  return matchingValues.length === 1 ? matchingValues[0] : undefined;
}

function _getGroupMatches(
  options: Readonly<{
    candidateGroups: ReadonlyArray<readonly string[]>;
    discoveredValues: readonly string[];
  }>,
): string[] | undefined {
  if (options.candidateGroups.length === 0) {
    return undefined;
  }
  const groupMatches = options.candidateGroups.map((candidateValues) => {
    return _getUniqueMatch({
      candidateValues,
      discoveredValues: options.discoveredValues,
    });
  });
  return groupMatches.every((match) => {
    return match !== undefined;
  })
    ? removeDuplicates(groupMatches as string[])
    : undefined;
}

/** Matches prompt-derived candidates against values queried locally. */
export const DiscoveryCandidateValues = {
  /** Returns the stored value when exactly one candidate matches. */
  getUniqueMatch: _getUniqueMatch,
  /**
   * Returns one stored value per named-value group when every group matches
   * exactly one, as a multi-value discovery's answer.
   */
  getGroupMatches: _getGroupMatches,
};
