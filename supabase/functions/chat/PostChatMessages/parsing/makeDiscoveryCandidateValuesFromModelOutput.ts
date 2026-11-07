import { isString } from "@avandar/utils";

/** Most prompt-derived candidate values a clarification may carry. */
export const MAX_DISCOVERY_CANDIDATE_VALUES = 8;

/** Longest prompt-derived candidate value a clarification may carry. */
export const MAX_DISCOVERY_CANDIDATE_CHARS = 80;

/** Creates bounded prompt-derived discovery candidates from model output. */
export function makeDiscoveryCandidateValuesFromModelOutput(
  modelOutput: unknown,
): string[] {
  if (!Array.isArray(modelOutput)) {
    return [];
  }

  return modelOutput
    .filter(isString)
    .map((candidateValue) => {
      return candidateValue.trim().slice(0, MAX_DISCOVERY_CANDIDATE_CHARS);
    })
    .filter((candidateValue, index, candidateValues) => {
      return (
        candidateValue.length > 0 &&
        candidateValues.indexOf(candidateValue) === index
      );
    })
    .slice(0, MAX_DISCOVERY_CANDIDATE_VALUES);
}

/** Most named-value groups a multi-value discovery may carry. */
export const MAX_DISCOVERY_CANDIDATE_GROUPS = 8;

/** Most stored forms one named-value group may list. */
export const MAX_DISCOVERY_CANDIDATES_PER_GROUP = 4;

/**
 * Creates bounded candidate groups from model output: one group per value the
 * user named in a multi-value discovery, each listing that value's plausible
 * stored forms. Groups that are not lists, or that end up empty, are dropped.
 */
export function makeDiscoveryCandidateGroupsFromModelOutput(
  modelOutput: unknown,
): string[][] {
  if (!Array.isArray(modelOutput)) {
    return [];
  }
  return modelOutput
    .filter(Array.isArray)
    .map((group) => {
      return makeDiscoveryCandidateValuesFromModelOutput(group).slice(
        0,
        MAX_DISCOVERY_CANDIDATES_PER_GROUP,
      );
    })
    .filter((group) => {
      return group.length > 0;
    })
    .slice(0, MAX_DISCOVERY_CANDIDATE_GROUPS);
}
