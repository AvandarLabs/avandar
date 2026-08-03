/**
 * Token and heuristic scoring helpers for offline dataset name resolution.
 */

/**
 * Tokenizes user text for loose label matching (filenames, topic words).
 */
export function tokenizeForDatasetMatch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\.(csv|parquet|json|tsv)$/gi, "")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => {
      return word.length >= 2;
    });
}

function shareStem(a: string, b: string): boolean {
  const minLen = Math.min(a.length, b.length);
  if (minLen < 4) {
    return false;
  }
  const stemLen = minLen - 1;
  return a.slice(0, stemLen) === b.slice(0, stemLen);
}

/**
 * Scores how well a dataset label matches the user prompt or table reference.
 */
export function scoreDatasetLabelMatch(args: {
  datasetName: string;
  promptTokens: readonly string[];
}): number {
  const labelLower = args.datasetName.toLowerCase();
  const labelTokens = tokenizeForDatasetMatch(labelLower);
  let score = 0;

  for (const token of args.promptTokens) {
    if (token.length < 3) {
      continue;
    }
    if (labelLower.includes(token)) {
      score += 3;
    }
    for (const labelToken of labelTokens) {
      if (labelToken === token) {
        score += 4;
      } else if (
        labelToken.includes(token) ||
        token.includes(labelToken) ||
        shareStem(labelToken, token)
      ) {
        score += 2;
      }
    }
  }

  return score;
}
