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
