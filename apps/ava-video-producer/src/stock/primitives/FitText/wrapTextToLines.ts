import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";

/** Fixed supported font sizes keep typography stable at every frame. */
export type FitTextSize = 12 | 14 | 16 | 18 | 20 | 24 | 28 | 32;

type TextBounds = {
  text: string;
  width: number;
  fontSize: FitTextSize;
  maxLines: number;
  /** Split only a token wider than the slot. Ordinary words stay intact. */
  breakLongWords?: boolean;
  /** Treat plain-label hard breaks and tabs as layout spaces only. */
  normalizeWhitespace?: boolean;
};

const SUPPORTED_SIZES: number[] = [12, 14, 16, 18, 20, 24, 28, 32];

const GRAPHEMES: Intl.Segmenter = new Intl.Segmenter("und", {
  granularity: "grapheme",
});

function _wrapParagraph({
  paragraph,
  width,
  fontSize,
  breakLongWords,
}: WrapParagraphOptions): string[] {
  const lines: string[] = [];
  paragraph
    .trim()
    .split(/\s+/)
    .forEach((word) => {
      if (_estimateWidth({ text: word, fontSize }) > width) {
        if (!breakLongWords) {
          throw new Error(
            "An unbreakable word cannot fit within the declared width.",
          );
        }
        _appendOversizedToken({ lines, word, width, fontSize });
        return;
      }
      const candidate = lines.length ? `${lines.at(-1)} ${word}` : word;
      if (
        lines.length &&
        _estimateWidth({ text: candidate, fontSize }) <= width
      ) {
        lines[lines.length - 1] = candidate;
      } else {
        lines.push(word);
      }
    });
  return lines;
}

/**
 * Wraps complete words using conservative, deterministic Arial width estimates.
 */
export function wrapTextToLines({
  text,
  width,
  fontSize,
  maxLines,
  breakLongWords = false,
  normalizeWhitespace = false,
}: Readonly<TextBounds>): string[] {
  if (!SUPPORTED_SIZES.includes(fontSize)) {
    throw new Error("Unsupported fixed text size.");
  }
  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isInteger(maxLines) ||
    maxLines < 1 ||
    maxLines > 8
  ) {
    throw new Error(
      "Text bounds need a positive finite width and one to eight lines.",
    );
  }
  const layoutText = normalizeWhitespace
    ? text.replace(/\s+/gu, " ").trim()
    : text;
  const lines = layoutText
    .split("\n")
    .flatMap((paragraph) =>
      _wrapParagraph({ paragraph, width, fontSize, breakLongWords }),
    );
  if (lines.length > maxLines) {
    throw new Error("Text cannot fit within the declared line count.");
  }
  return lines;
}
/** Inputs for wrapParagraph. */
type WrapParagraphOptions = {
  paragraph: string;
  width: number;
  fontSize: number;
  breakLongWords: boolean;
};

function _estimateWidth({
  text,
  fontSize,
}: {
  text: string;
  fontSize: number;
}): number {
  return Array.from(GRAPHEMES.segment(text)).reduce(
    (total, { segment }) =>
      total + _getWidthFromGrapheme({ grapheme: segment, fontSize }),
    0,
  );
}

function _getWidthFromGrapheme({
  grapheme,
  fontSize,
}: {
  grapheme: string;
  fontSize: number;
}): number {
  // Sum base advances to cover fallback glyphs without charging marks or
  // joiners.
  const bases = Array.from(grapheme).filter(
    (character) =>
      !/[\p{Nonspacing_Mark}\p{Enclosing_Mark}\p{Default_Ignorable_Code_Point}\p{Emoji_Modifier}]/u.test(
        character,
      ),
  );
  const baseWidth = bases.reduce((total, character) => {
    const factor = /\s/.test(character)
      ? 0.35
      : /[MW@#%]/.test(character)
        ? 1
        : /[ilI.,'!:|]/.test(character)
          ? 0.4
          : (character.codePointAt(0) ?? 0) > 0x024f
            ? 1.1
            : /[A-Z]/.test(character)
              ? 0.8
              : 0.7;
    return (
      total +
      Math.max(
        fontSize * factor,
        getConservativeWidthFromText({ text: character, fontSize }),
      )
    );
  }, 0);
  const needsFallbackFloor =
    !bases.length ||
    /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3\ufe0f]/u.test(
      grapheme,
    );
  return Math.max(
    baseWidth,
    needsFallbackFloor ? Math.ceil(fontSize * 1.1) : 0,
  );
}
/** Inputs for appendOversizedToken. */
type AppendOversizedTokenOptions = {
  lines: string[];
  word: string;
  width: number;
  fontSize: number;
};

function _appendOversizedToken({
  lines,
  word,
  width,
  fontSize,
}: AppendOversizedTokenOptions): void {
  Array.from(GRAPHEMES.segment(word)).forEach(({ segment }, index) => {
    if (_estimateWidth({ text: segment, fontSize }) > width) {
      throw new Error("A whole grapheme cannot fit within the declared width.");
    }
    const separator = index === 0 && lines.at(-1) ? " " : "";
    const candidate = `${lines.at(-1) ?? ""}${separator}${segment}`;
    if (
      lines.length &&
      _estimateWidth({ text: candidate, fontSize }) <= width
    ) {
      lines[lines.length - 1] = candidate;
    } else {
      lines.push(segment);
    }
  });
}
export type { TextBounds };
