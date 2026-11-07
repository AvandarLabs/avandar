/** A span of a text, from `start` up to but not including `end`. */
export type TextRange = {
  start: number;
  end: number;
};

/** Where a search matched a text, and how well. */
export type TokenSearchMatch = {
  /** The matched spans, in text order, with touching spans merged. */
  matchedRanges: readonly TextRange[];

  /**
   * Higher is better. A token that starts a word outscores one buried inside
   * a word, and a match at the very start of the text scores a little more.
   */
  score: number;
};

/** One piece of a text, marked by whether a search matched it. */
export type TextSegment = {
  text: string;
  isMatch: boolean;
};

/**
 * A text lowercased and stripped of accents, with each folded character
 * pointing back at the original characters it came from, so a match found in
 * the folded text can be highlighted in the original.
 */
type FoldedText = {
  folded: string;
  originalStarts: readonly number[];
  originalEnds: readonly number[];
};

const WORD_CHARACTER_REGEX = /[\p{L}\p{N}]/u;
const COMBINING_MARK_REGEX = /\p{M}/gu;

function _foldCharacter(character: string): string {
  return character
    .normalize("NFD")
    .replace(COMBINING_MARK_REGEX, "")
    .toLowerCase();
}

function _foldText(text: string): FoldedText {
  const foldedCharacters: string[] = [];
  const originalStarts: number[] = [];
  const originalEnds: number[] = [];
  let originalIndex = 0;
  for (const character of text) {
    const originalEnd = originalIndex + character.length;
    for (const foldedCharacter of _foldCharacter(character)) {
      foldedCharacters.push(foldedCharacter);
      originalStarts.push(originalIndex);
      originalEnds.push(originalEnd);
    }
    originalIndex = originalEnd;
  }
  return { folded: foldedCharacters.join(""), originalStarts, originalEnds };
}

function _isWordStart(folded: string, index: number): boolean {
  return index === 0 || !WORD_CHARACTER_REGEX.test(folded[index - 1] ?? "");
}

function _overlapsAny(
  range: TextRange,
  claimedRanges: readonly TextRange[],
): boolean {
  return claimedRanges.some((claimedRange) => {
    return range.start < claimedRange.end && claimedRange.start < range.end;
  });
}

/**
 * The best unclaimed occurrence of `token` in `folded`: the first one that
 * starts a word, else the first one at all.
 */
function _findTokenRange(
  folded: string,
  token: string,
  claimedRanges: readonly TextRange[],
): TextRange | undefined {
  let firstFreeRange: TextRange | undefined;
  let index = folded.indexOf(token);
  while (index !== -1) {
    const range = { start: index, end: index + token.length };
    if (!_overlapsAny(range, claimedRanges)) {
      if (_isWordStart(folded, index)) {
        return range;
      }
      firstFreeRange ??= range;
    }
    index = folded.indexOf(token, index + 1);
  }
  return firstFreeRange;
}

function _mergeTouchingRanges(ranges: readonly TextRange[]): TextRange[] {
  const sortedRanges = [...ranges].sort((rangeA, rangeB) => {
    return rangeA.start - rangeB.start;
  });
  return sortedRanges.reduce<TextRange[]>((mergedRanges, range) => {
    const lastRange = mergedRanges.at(-1);
    if (lastRange && range.start <= lastRange.end) {
      return [
        ...mergedRanges.slice(0, -1),
        { start: lastRange.start, end: Math.max(lastRange.end, range.end) },
      ];
    }
    return [...mergedRanges, range];
  }, []);
}

function _splitSearchIntoTokens(search: string): string[] {
  return _foldText(search)
    .folded.split(/\s+/)
    .filter((token) => {
      return token.length > 0;
    })
    .sort((tokenA, tokenB) => {
      // Longer tokens claim their spot first, so a short token cannot take
      // the only place a longer one fits.
      return tokenB.length - tokenA.length;
    });
}

/**
 * Matches `search` against `text` the way a typeahead should: case and
 * accents are ignored, the search is split on whitespace, and every token
 * must appear somewhere in the text, in any order and inside any word. So
 * "ty gov" matches "City government". Returns undefined when any token is
 * missing. A blank search matches everything with nothing highlighted.
 */
export function findTokenSearchMatch(
  text: string,
  search: string,
): TokenSearchMatch | undefined {
  const tokens = _splitSearchIntoTokens(search);
  const { folded, originalStarts, originalEnds } = _foldText(text);
  const claimedRanges: TextRange[] = [];
  let score = 0;
  for (const token of tokens) {
    const range = _findTokenRange(folded, token, claimedRanges);
    if (!range) {
      return undefined;
    }
    claimedRanges.push(range);
    score += _isWordStart(folded, range.start) ? 2 : 1;
    if (range.start === 0) {
      score += 1;
    }
  }
  return {
    matchedRanges: _mergeTouchingRanges(
      claimedRanges.map((range) => {
        return {
          start: originalStarts[range.start] ?? 0,
          end: originalEnds[range.end - 1] ?? text.length,
        };
      }),
    ),
    score,
  };
}

/** Cuts `text` into matched and unmatched segments, in text order. */
export function splitTextByMatchedRanges(
  text: string,
  matchedRanges: readonly TextRange[],
): TextSegment[] {
  const segments: TextSegment[] = [];
  let index = 0;
  for (const range of matchedRanges) {
    if (range.start > index) {
      segments.push({ text: text.slice(index, range.start), isMatch: false });
    }
    segments.push({ text: text.slice(range.start, range.end), isMatch: true });
    index = range.end;
  }
  if (index < text.length) {
    segments.push({ text: text.slice(index), isMatch: false });
  }
  return segments;
}

/**
 * The items `search` matches, best match first. Items that match equally
 * well keep their original order, so a list already sorted by something
 * meaningful (such as how many results each would show) stays that way
 * within each tier.
 */
export function filterAndRankByTokenSearch<T>(
  items: readonly T[],
  search: string,
  getText: (item: T) => string,
): T[] {
  return items
    .flatMap((item, index) => {
      const match = findTokenSearchMatch(getText(item), search);
      return match ? [{ item, index, score: match.score }] : [];
    })
    .sort((rankedA, rankedB) => {
      return rankedB.score - rankedA.score || rankedA.index - rankedB.index;
    })
    .map((ranked) => {
      return ranked.item;
    });
}
