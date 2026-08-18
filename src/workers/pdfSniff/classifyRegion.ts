import { groupLines } from "./groupLines";
import { parseRunInLabels } from "./parseRunInLabels";
import type { PdfRegionShape, RegionGeometry } from "./types";

export type RegionClassification = {
  shape: PdfRegionShape;
  confidence: "high" | "medium" | "low";
  /** Human-readable reasons, shown beside the override control. */
  evidence: readonly string[];
};

/** Above this many words per line, the region is running prose. */
const PROSE_WORDS_PER_LINE = 6;

/** A label in a graphic is short. Longer text is a sentence. */
const MAX_GRAPHIC_LABEL_WORDS = 4;

function _isNumeric(text: string): boolean {
  return /^[$€£¥]?\s*-?[\d][\d,. ]*\s*%?$/u.test(text.trim());
}

/**
 * Decides which extractor should read a region, and says why.
 *
 * The evidence matters as much as the verdict. A user who disagrees needs to
 * see what we looked at before overriding, otherwise the dropdown is a guess
 * they have no basis to correct.
 */
export function classifyRegion(region: RegionGeometry): RegionClassification {
  const evidence: string[] = [];
  const lines = groupLines(region.textItems);
  const items = region.textItems.filter((item) => {
    return item.text.trim().length > 0;
  });

  if (items.length === 0) {
    return {
      shape: "prose_measures",
      confidence: "low",
      evidence: ["This region contains no text."],
    };
  }

  const numericItems = items.filter((item) => {
    return _isNumeric(item.text);
  });
  const wordsPerLine =
    lines.reduce((sum, line) => {
      return sum + line.text.split(/\s+/u).length;
    }, 0) / Math.max(1, lines.length);

  // Ruling lines are the strongest signal available and need no inference.
  const horizontalRules = region.rules.filter((rule) => {
    return rule.orientation === "horizontal";
  });
  if (horizontalRules.length >= 2 && lines.length >= 2) {
    evidence.push(
      `${region.rules.length} ruling lines and ${lines.length} rows.`,
    );
    return { shape: "grid_table", confidence: "high", evidence };
  }

  // Run-in labels under a heading are unambiguous when present.
  const blocks = parseRunInLabels(lines);
  if (blocks.length > 0) {
    evidence.push(
      `${blocks.length} labelled block${blocks.length === 1 ? "" : "s"} ` +
        `with run-in labels (${Object.keys(blocks[0]!.fields).join(", ")}).`,
    );
    return { shape: "repeating_blocks", confidence: "high", evidence };
  }

  const shortLabels = items.filter((item) => {
    return (
      !_isNumeric(item.text) &&
      item.text.trim().split(/\s+/u).length <= MAX_GRAPHIC_LABEL_WORDS
    );
  });

  // A graphic is numbers and short captions with no rules and no sentences.
  if (
    numericItems.length >= 2 &&
    shortLabels.length >= 2 &&
    wordsPerLine < PROSE_WORDS_PER_LINE
  ) {
    evidence.push(
      `${numericItems.length} numbers, ${shortLabels.length} short labels, ` +
        "no ruling lines.",
    );
    return { shape: "labelled_graphic", confidence: "medium", evidence };
  }

  if (wordsPerLine >= PROSE_WORDS_PER_LINE) {
    evidence.push(
      `${Math.round(wordsPerLine)} words per line on average, ` +
        `${numericItems.length} standalone numbers.`,
    );
    return {
      shape: "prose_measures",
      confidence: numericItems.length > 0 ? "medium" : "low",
      evidence,
    };
  }

  evidence.push(
    `${items.length} text items, ${numericItems.length} numeric, ` +
      "no clear structure.",
  );
  return { shape: "prose_measures", confidence: "low", evidence };
}
