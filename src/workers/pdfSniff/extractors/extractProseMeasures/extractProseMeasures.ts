import { extractMeasurements } from "../../extractMeasurements/extractMeasurements";
import { groupLines } from "../../groupLines/groupLines";
import type {
  BBox,
  ExtractedTable,
  PdfCellFlag,
  RegionGeometry,
  TextLine,
} from "../../pdfSniff.types";

/**
 * Below this fraction of the region's numerals appearing in extracted rows,
 * we tell the user we probably missed things. Feeds the model-assist offer.
 */
const MIN_NUMERAL_COVERAGE = 0.5;

/** Sentence terminator followed by whitespace and a capital or end of text. */
const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z$€£"'(]|$)/u;

function _countNumerals(text: string): number {
  return (text.match(/\d+(?:,\d{3})*(?:\.\d+)?/gu) ?? []).length;
}

/**
 * Joins the region's lines back into running text.
 *
 * A line that ends in a hyphen is a word broken across the line break, so the
 * hyphen and the break both disappear. Every other break becomes a space.
 * Removing every "hyphen followed by whitespace" instead would also weld
 * "cases - 15" into "cases15", inventing a number that is not in the
 * document.
 */
function _joinLines(lines: readonly TextLine[]): string {
  return lines
    .reduce((text, line, index) => {
      if (index === 0) {
        return line.text;
      }
      return text.endsWith("-") ?
          `${text.slice(0, -1)}${line.text}`
        : `${text} ${line.text}`;
    }, "")
    .replace(/\s+/gu, " ")
    .trim();
}

/**
 * The region's lines joined back into one run of text.
 *
 * Exported because the model-assist path has to send the region's text and
 * only the region's text. Sharing this function is what guarantees the
 * assistant sees exactly what the rules saw: the box the user drew, not the
 * page around it and not the document.
 */
export function joinRegionText(region: RegionGeometry): string {
  return _joinLines(groupLines(region.textItems));
}

/**
 * Reads measurements out of a region of running prose.
 *
 * Lines are joined before sentences are split, because a line break inside a
 * sentence is a layout artefact: splitting on it would sever "166 cases and
 * 13 deaths" from the "in South Darfur" that names their subject.
 */
export function extractProseMeasures(
  region: RegionGeometry,
  options: { regionId: string },
): ExtractedTable {
  const text = joinRegionText(region);

  const measurements = text.split(SENTENCE_SPLIT).flatMap((sentence) => {
    return extractMeasurements(sentence);
  });

  // Coverage is reported whether or not anything was read, because a region
  // full of numerals that produced no rows at all is the strongest signal
  // that rules were the wrong tool for it.
  const flags: PdfCellFlag[] = [];
  const numeralCount = _countNumerals(text);
  if (
    numeralCount > 0 &&
    measurements.length / numeralCount < MIN_NUMERAL_COVERAGE
  ) {
    flags.push({
      // Region-level: this is true of the passage, not of one cell.
      rowIndex: -1,
      columnIndex: -1,
      reason: "unmatched_value",
      detail:
        `We read ${measurements.length} of the ${numeralCount} numbers in ` +
        "this region. Sentences that name their subject indirectly are hard " +
        "to read with rules alone.",
    });
  }

  if (measurements.length === 0) {
    return {
      regionId: options.regionId,
      cells: [],
      headerRows: 0,
      flags,
      extractedBy: "rules",
      rowProvenance: [],
    };
  }

  const cells: string[][] = [
    ["subject", "metric", "value", "unit", "source_text"],
  ];
  const rowProvenance: Array<{ page: number; bbox: BBox }> = [];

  for (const measurement of measurements) {
    cells.push([
      measurement.subject ?? "",
      measurement.metric,
      String(measurement.value),
      measurement.unit,
      measurement.sourceText,
    ]);
    // Sentence-level provenance would need per-sentence geometry, which the
    // line join discards. Region-level is honest and still lets the reviewer
    // find the passage.
    rowProvenance.push({ page: region.pageIndex, bbox: region.bbox });
  }

  return {
    regionId: options.regionId,
    cells,
    headerRows: 1,
    flags,
    extractedBy: "rules",
    rowProvenance,
  };
}
