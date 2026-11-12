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

/** How many leading characters, up to four, two words share. */
function _getCommonPrefixLength(wordA: string, wordB: string): number {
  const prefixEnd = wordA
    .slice(0, 4)
    .split("")
    .findIndex((char, index) => {
      return char !== wordB[index];
    });
  return prefixEnd < 0 ? Math.min(4, wordA.length, wordB.length) : prefixEnd;
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
  const prefix = _getCommonPrefixLength(wordA, wordB);
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
 * How alike two names are from their unique tokens: the share of each
 * name's tokens the other name also has. `isSame` decides whether two
 * tokens count as one word, so a caller can pass numbered tokens and a
 * memoized check.
 */
export function getNameScoreFromTokens<Token>(
  tokensA: readonly Token[],
  tokensB: readonly Token[],
  isSame: (tokenA: Token, tokenB: Token) => boolean,
): number {
  if (tokensA.length === 0 || tokensB.length === 0) {
    return 0;
  }
  const matchedA = tokensA.filter((tokenA) => {
    return tokensB.some((tokenB) => {
      return isSame(tokenA, tokenB);
    });
  }).length;
  const matchedB = tokensB.filter((tokenB) => {
    return tokensA.some((tokenA) => {
      return isSame(tokenA, tokenB);
    });
  }).length;
  return (matchedA + matchedB) / (tokensA.length + tokensB.length);
}

/** The distinct tokens of a column name, in the order they first appear. */
export function getUniqueTokensFromColumnName(columnName: string): string[] {
  return [...new Set(getTokensFromColumnName(columnName))];
}

/**
 * How alike two column names are, from 0 to 1: the share of each name's
 * tokens the other name also has, where two long words a letter or two
 * apart count as one. `zip_code` and `ZIP` score 1; `case_id` and `CaseNo`
 * score 0.5.
 */
export function getNameScore(nameA: string, nameB: string): number {
  return getNameScoreFromTokens(
    getUniqueTokensFromColumnName(nameA),
    getUniqueTokensFromColumnName(nameB),
    _isSameWord,
  );
}

/** Scores many column names against each other, computing each pair once. */
export type NameScorer = {
  /** A small number standing for a column name, the same for equal names. */
  getNameId: (columnName: string) => number;
  /** The name score of two names given by `getNameId`. */
  getScore: (idA: number, idB: number) => number;
};

/** Gives each distinct word a number, and remembers which words are one. */
function _createWordIndex(): {
  getWordId: (word: string) => number;
  isSameWordId: (idA: number, idB: number) => boolean;
} {
  const idsByWord = new Map<string, number>();
  const words: string[] = [];
  // 0 not compared yet, 1 the same word, 2 different words.
  const rows: Uint8Array[] = [];
  const getWordId = (word: string): number => {
    const known = idsByWord.get(word);
    if (known !== undefined) {
      return known;
    }
    idsByWord.set(word, words.length);
    words.push(word);
    return words.length - 1;
  };
  const isSameWordId = (idA: number, idB: number): boolean => {
    if (idA === idB) {
      return true;
    }
    const row = (rows[idA] ??= new Uint8Array(words.length));
    const known = row[idB];
    if (known) {
      return known === 1;
    }
    const isSame = _isSameWord(words[idA] ?? "", words[idB] ?? "");
    row[idB] = isSame ? 1 : 2;
    return isSame;
  };
  return { getWordId, isSameWordId };
}

/**
 * A map of name pair to score that grows with the pairs compared. A name
 * keeps its scores in a `Map` until it holds so many that a flat array
 * indexed by name id is smaller and faster, then switches to that array.
 * A name compared with only a few others never pays for a row as long as
 * the number of distinct names.
 */
function _createScoreMemo(getNameCount: () => number): {
  get: (idA: number, idB: number) => number | undefined;
  set: (idA: number, idB: number, score: number) => void;
} {
  const denseRows: Array<Float64Array | undefined> = [];
  const sparseRows: Array<Map<number, number> | undefined> = [];
  // A Map entry costs about this many array slots.
  const SLOTS_PER_MAP_ENTRY = 8;
  const get = (idA: number, idB: number): number | undefined => {
    const dense = denseRows[idA];
    if (dense) {
      const known = dense[idB];
      return known !== undefined && known >= 0 ? known : undefined;
    }
    return sparseRows[idA]?.get(idB);
  };
  const set = (idA: number, idB: number, score: number): void => {
    const dense = denseRows[idA];
    if (dense) {
      dense[idB] = score;
      return;
    }
    const sparse = (sparseRows[idA] ??= new Map<number, number>());
    sparse.set(idB, score);
    if (sparse.size * SLOTS_PER_MAP_ENTRY > getNameCount()) {
      const filled = new Float64Array(getNameCount()).fill(-1);
      sparse.forEach((known, id) => {
        filled[id] = known;
      });
      denseRows[idA] = filled;
      sparseRows[idA] = undefined;
    }
  };
  return { get, set };
}

/**
 * A `NameScorer` that tokenizes each distinct name once and remembers every
 * word pair and name pair it has compared. Give every name its id with
 * `getNameId` before scoring, so a dense row is sized once.
 */
export function createNameScorer(): NameScorer {
  const idsByName = new Map<string, number>();
  const wordIdsByName: number[][] = [];
  const memo = _createScoreMemo(() => {
    return wordIdsByName.length;
  });
  const { getWordId, isSameWordId } = _createWordIndex();
  const getNameId = (columnName: string): number => {
    const known = idsByName.get(columnName);
    if (known !== undefined) {
      return known;
    }
    idsByName.set(columnName, wordIdsByName.length);
    wordIdsByName.push(
      getUniqueTokensFromColumnName(columnName).map(getWordId),
    );
    return wordIdsByName.length - 1;
  };
  const getScore = (idA: number, idB: number): number => {
    const known = memo.get(idA, idB);
    if (known !== undefined) {
      return known;
    }
    const wordsA = wordIdsByName[idA] ?? [];
    const wordsB = wordIdsByName[idB] ?? [];
    const score = getNameScoreFromTokens(wordsA, wordsB, isSameWordId);
    memo.set(idA, idB, score);
    return score;
  };
  return { getNameId, getScore };
}
