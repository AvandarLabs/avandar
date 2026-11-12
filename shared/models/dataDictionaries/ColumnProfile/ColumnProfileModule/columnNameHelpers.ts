/**
 * Abbreviations column names use, expanded before two names are compared,
 * so `onset_dt` and `onset_date` read the same.
 */
const ABBREVIATIONS: Readonly<Record<string, string>> = {
  dt: "date",
  cd: "code",
  yn: "yes no",
  num: "number",
  hosp: "hospitalized",
  vax: "vaccination",
  dob: "date of birth",
};

/**
 * Phrases that name the same thing, each rewritten to one spelling, so
 * `zip_code` matches `ZIP` and `GENDER` matches `sex`. Longer phrases come
 * first, so a phrase is rewritten before any shorter phrase inside it.
 */
const SYNONYM_PHRASES: ReadonlyArray<readonly [string, string]> = [
  ["date of birth", "birth date"],
  ["postal code", "zip"],
  ["post code", "zip"],
  ["zip code", "zip"],
  ["birthdate", "birth date"],
  ["postcode", "zip"],
  ["zipcode", "zip"],
  ["gender", "sex"],
];

/**
 * Words shorter than this are the same word only when identical.
 * Jaro-Winkler rates short words such as `sex` and `ses` as near-identical,
 * which would merge unrelated columns.
 */
const MIN_FUZZY_WORD_LENGTH = 4;

/** Two longer words at least this similar count as one word. */
const FUZZY_WORD_SIMILARITY = 0.9;

/**
 * Splits a column name into lowercase words at camelCase humps, spaces, and
 * punctuation: `CaseNo` gives `case`, `no`, and `hosp_yn` gives `hosp`,
 * `yn`. Digits stay attached to their word.
 */
export function getWordsFromColumnName(columnName: string): string[] {
  return columnName
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, "$1 $2")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => {
      return word !== "";
    });
}

/**
 * The words two column names are compared by: abbreviations expanded and
 * synonyms rewritten to one spelling. `onset_dt` gives `onset`, `date`;
 * both `GENDER` and `sex` give `sex`.
 */
export function getTokensFromColumnName(columnName: string): string[] {
  const expanded = getWordsFromColumnName(columnName).flatMap((word) => {
    return (ABBREVIATIONS[word] ?? word).split(" ");
  });
  const phrase = SYNONYM_PHRASES.reduce(
    (text, [fromPhrase, toPhrase]) => {
      return text.split(` ${fromPhrase} `).join(` ${toPhrase} `);
    },
    ` ${expanded.join(" ")} `,
  );
  return phrase.split(" ").filter((token) => {
    return token !== "";
  });
}

/**
 * A column name as a dictionary entry name: its words in lowercase, joined
 * by underscores, so `GENDER` gives `gender` and `CaseNo` gives `case_no`.
 * A name with no letters or digits is only trimmed.
 */
export function getEntryNameFromColumnName(columnName: string): string {
  const words = getWordsFromColumnName(columnName);
  return words.length > 0 ? words.join("_") : columnName.trim();
}

/** Jaro-Winkler similarity of two words, from 0 to 1. */
function _getJaroWinkler(wordA: string, wordB: string): number {
  if (wordA === wordB) {
    return 1;
  }
  const window = Math.max(
    0,
    Math.floor(Math.max(wordA.length, wordB.length) / 2) - 1,
  );
  const isMatchedB = wordB.split("").map(() => {
    return false;
  });
  const matchedA = wordA.split("").flatMap((char, indexA) => {
    const start = Math.max(0, indexA - window);
    const end = Math.min(wordB.length, indexA + window + 1);
    const offset = wordB
      .slice(start, end)
      .split("")
      .findIndex((charB, index) => {
        return charB === char && !isMatchedB[start + index];
      });
    if (offset < 0) {
      return [];
    }
    isMatchedB[start + offset] = true;
    return [char];
  });
  if (matchedA.length === 0) {
    return 0;
  }
  const matchedB = wordB.split("").filter((_char, index) => {
    return isMatchedB[index];
  });
  const halfTranspositions = matchedA.filter((char, index) => {
    return char !== matchedB[index];
  }).length;
  const count = matchedA.length;
  const jaro =
    (count / wordA.length +
      count / wordB.length +
      (count - halfTranspositions / 2) / count) /
    3;
  const prefixEnd = wordA
    .slice(0, 4)
    .split("")
    .findIndex((char, index) => {
      return char !== wordB[index];
    });
  const prefix =
    prefixEnd < 0 ? Math.min(4, wordA.length, wordB.length) : prefixEnd;
  return jaro + prefix * 0.1 * (1 - jaro);
}

function _isSameWord(wordA: string, wordB: string): boolean {
  if (wordA === wordB) {
    return true;
  }
  return (
    Math.min(wordA.length, wordB.length) >= MIN_FUZZY_WORD_LENGTH &&
    _getJaroWinkler(wordA, wordB) >= FUZZY_WORD_SIMILARITY
  );
}

/**
 * How alike two column names are, from 0 to 1: the share of each name's
 * tokens the other name also has, where two long words a letter or two
 * apart count as one. `zip_code` and `ZIP` score 1; `case_id` and `CaseNo`
 * score 0.5.
 */
export function getNameScore(nameA: string, nameB: string): number {
  const tokensA = [...new Set(getTokensFromColumnName(nameA))];
  const tokensB = [...new Set(getTokensFromColumnName(nameB))];
  if (tokensA.length === 0 || tokensB.length === 0) {
    return 0;
  }
  const matchedA = tokensA.filter((tokenA) => {
    return tokensB.some((tokenB) => {
      return _isSameWord(tokenA, tokenB);
    });
  }).length;
  const matchedB = tokensB.filter((tokenB) => {
    return tokensA.some((tokenA) => {
      return _isSameWord(tokenA, tokenB);
    });
  }).length;
  return (matchedA + matchedB) / (tokensA.length + tokensB.length);
}
