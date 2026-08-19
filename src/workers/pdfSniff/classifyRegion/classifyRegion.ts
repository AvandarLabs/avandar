import { deriveColumns } from "../deriveColumns";
import { detectGraphicType } from "../detectGraphicType/detectGraphicType";
import { groupLines } from "../groupLines/groupLines";
import { parseRunInLabels } from "../parseRunInLabels/parseRunInLabels";
import type { PdfRegionShape, RegionGeometry } from "../pdfSniff.types";

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

  /*
   * Ruling lines are a strong signal, but only together with the text they
   * are supposed to be ruling.
   *
   * On their own they say almost nothing: a map's borders, a chart's axes and
   * gridlines, and a figure's frame all reach `extractPageGeometry` as
   * `RuleSegment`s, and measured on the gate documents they are WIDER and more
   * numerous than a real table's. The OCHA choropleth carries 17 horizontal
   * rules and its weekly trend chart 34, five of which span 88% or more of the
   * region; Table 1 of the Frontiers paper is ruled by three. So neither the
   * count nor the width of the rules separates a table from a graphic.
   *
   * What does separate them is whether the text lines up underneath the rules.
   * `deriveColumns` is the same function `extractGridTable` uses to decide
   * where the columns are, and it finds none in either OCHA region and three
   * in each page of the Frontiers table. Asking it here means the classifier
   * and the extractor agree by construction: we only call a region a grid
   * table when the grid extractor can actually read one out of it. Calling it
   * one when the columns are absent is not a harmless guess, because
   * `extractGridTable` returns zero rows in that case.
   */
  const horizontalRules = region.rules.filter((rule) => {
    return rule.orientation === "horizontal";
  });
  const columns = deriveColumns(lines);
  const isRuled = horizontalRules.length >= 2 && lines.length >= 2;
  if (isRuled && columns.length >= 2) {
    evidence.push(
      `${region.rules.length} ruling lines, and ${lines.length} rows aligned in ${columns.length} columns.`,
    );
    return { shape: "grid_table", confidence: "high", evidence };
  }
  if (isRuled) {
    // Said out loud rather than dropped: the rules are the first thing a user
    // sees in the region, so the reason we discounted them belongs beside
    // whatever verdict follows.
    evidence.push(
      `${horizontalRules.length} horizontal ruling lines, but the text does not line up in columns underneath them, so they are borders or gridlines rather than a table's rules.`,
    );
  }

  // Run-in labels under a heading are unambiguous when present.
  const blocks = parseRunInLabels(lines);
  if (blocks.length > 0) {
    evidence.push(
      `${blocks.length} labelled block${blocks.length === 1 ? "" : "s"} with run-in labels (${Object.keys(blocks[0]!.fields).join(", ")}).`,
    );
    return { shape: "repeating_blocks", confidence: "high", evidence };
  }

  const shortLabels = items.filter((item) => {
    return (
      !_isNumeric(item.text) &&
      item.text.trim().split(/\s+/u).length <= MAX_GRAPHIC_LABEL_WORDS
    );
  });

  // A graphic is numbers and short captions with no columns and no sentences.
  if (
    numericItems.length >= 2 &&
    shortLabels.length >= 2 &&
    wordsPerLine < PROSE_WORDS_PER_LINE
  ) {
    evidence.push(
      `${numericItems.length} numbers and ${shortLabels.length} short labels, scattered rather than tabulated.`,
    );
    /*
     * What the region was DRAWN as, which the cascade above cannot see. It
     * does not change the shape, because every one of these is read by the
     * same extractor and the shape enum is persisted. It changes what we can
     * say about it, and the user is choosing whether to override us from that
     * sentence: "5 bars growing from a shared left edge" is a reason, where
     * "scattered rather than tabulated" is only a description.
     */
    const graphic = detectGraphicType(region);
    evidence.push(...graphic.evidence);
    return {
      shape: "labelled_graphic",
      // Marks that form a chart are a far stronger signal than word counts.
      confidence: graphic.kind === "unknown" ? "medium" : "high",
      evidence,
    };
  }

  if (wordsPerLine >= PROSE_WORDS_PER_LINE) {
    evidence.push(
      `${Math.round(wordsPerLine)} words per line on average, ${numericItems.length} standalone numbers.`,
    );
    return {
      shape: "prose_measures",
      confidence: numericItems.length > 0 ? "medium" : "low",
      evidence,
    };
  }

  evidence.push(
    `${items.length} text items, ${numericItems.length} numeric, no clear structure.`,
  );
  return { shape: "prose_measures", confidence: "low", evidence };
}
