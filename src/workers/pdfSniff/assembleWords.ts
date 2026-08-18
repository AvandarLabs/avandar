import type { TextItem } from "./types";

/**
 * A horizontal gap wider than this fraction of the font size is a word
 * boundary. Tuned against generators that emit one item per glyph: real
 * inter-letter spacing is a small fraction of the em, while a space is
 * typically a quarter to a third of it.
 */
const SPACE_GAP_RATIO = 0.25;

/** Baselines further apart than this are different lines. */
const SAME_LINE_TOLERANCE = 1.5;

function _isSameRun(previous: TextItem, current: TextItem): boolean {
  if (Math.abs(previous.y - current.y) > SAME_LINE_TOLERANCE) {
    return false;
  }
  if (previous.fontName !== current.fontName) {
    return false;
  }
  const gap = current.x - (previous.x + previous.width);
  const spaceThreshold =
    Math.max(previous.height, current.height) * SPACE_GAP_RATIO;
  return gap < spaceThreshold;
}

function _mergeRun(run: readonly TextItem[]): TextItem {
  const first = run[0]!;
  const last = run[run.length - 1]!;
  return {
    text: run
      .map((item) => {
        return item.text;
      })
      .join(""),
    x: first.x,
    y: first.y,
    width: last.x + last.width - first.x,
    height: Math.max(
      ...run.map((item) => {
        return item.height;
      }),
    ),
    fontName: first.fontName,
    // The worst ratio in the run wins. Averaging would let one bad glyph in a
    // long word slip under the unreliable-text threshold.
    unmappedCharRatio: Math.max(
      ...run.map((item) => {
        return item.unmappedCharRatio;
      }),
    ),
  };
}

/**
 * Reconstructs words from generators that emit one text item per glyph.
 *
 * Returns the input untouched when it already contains spaces, because the
 * common case is a generator that emits whole words or whole lines and
 * re-splitting those would lose information rather than add it.
 */
export function assembleWords(items: readonly TextItem[]): readonly TextItem[] {
  const hasSpaces = items.some((item) => {
    return item.text.includes(" ");
  });
  if (hasSpaces || items.length === 0) {
    return items;
  }

  const words: TextItem[] = [];
  let run: TextItem[] = [items[0]!];

  for (let i = 1; i < items.length; i += 1) {
    const current = items[i]!;
    const previous = run[run.length - 1]!;
    if (_isSameRun(previous, current)) {
      run.push(current);
    } else {
      words.push(_mergeRun(run));
      run = [current];
    }
  }
  words.push(_mergeRun(run));

  return words;
}
