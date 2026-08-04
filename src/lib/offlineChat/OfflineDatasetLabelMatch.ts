/**
 * Token and heuristic scoring helpers for offline dataset name resolution.
 */

/**
 * Tokenizes user text for loose label matching (filenames, topic words).
 */
function _tokenize(text: string): string[] {
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
function _score(args: {
  datasetName: string;
  promptTokens: readonly string[];
}): number {
  const labelLower = args.datasetName.toLowerCase();
  const labelTokens = _tokenize(labelLower);
  return args.promptTokens.reduce((score, token) => {
    if (token.length < 3) {
      return score;
    }
    const directMatchScore = labelLower.includes(token) ? 3 : 0;
    const tokenScore = labelTokens.reduce((labelScore, labelToken) => {
      if (labelToken === token) {
        return labelScore + 4;
      }
      return (
          labelToken.includes(token) ||
            token.includes(labelToken) ||
            shareStem(labelToken, token)
        ) ?
          labelScore + 2
        : labelScore;
    }, 0);
    return score + directMatchScore + tokenScore;
  }, 0);
}

/** Tokenization and scoring for loose offline dataset-name matching. */
export const OfflineDatasetLabelMatch = {
  tokenize: _tokenize,
  score: _score,
};
