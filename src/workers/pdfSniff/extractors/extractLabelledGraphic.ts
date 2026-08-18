import { assembleLabels } from "../assembleLabels";
import { normalizeCellValue } from "../normalizeCellValue";
import { pairByProximity } from "../pairByProximity";
import type {
  BBox,
  ExtractedTable,
  PdfCellFlag,
  RegionGeometry,
  TextItem,
} from "../types";

/** A text item that is entirely numeric is a value; anything else a label. */
const VALUE_PATTERN = /^[$€£¥]?\s*-?[\d][\d,. ]*\s*%?$/u;

function _isValue(item: TextItem): boolean {
  return VALUE_PATTERN.test(item.text.trim());
}

function _bboxOf(item: TextItem): BBox {
  return [item.x, item.y, item.x + item.width, item.y + item.height];
}

/**
 * Reads a map, chart or KPI tile whose values are text at coordinates.
 *
 * The PDF records no link between a figure and its caption, so the pairing has
 * to be recovered geometrically. Everything uncertain is flagged rather than
 * dropped or silently resolved, because the measurement behind this extractor
 * showed that roughly one pair in eight is a near-tie and roughly one in
 * sixteen is simply wrong.
 */
export function extractLabelledGraphic(
  region: RegionGeometry,
  options: { regionId: string; ambiguityThreshold?: number },
): ExtractedTable {
  const values = region.textItems.filter(_isValue);
  const labelItems = region.textItems.filter((item) => {
    return !_isValue(item) && item.text.trim().length > 0;
  });

  const labels = assembleLabels(labelItems);
  const { pairs, unmatchedLabels, unmatchedValues } = pairByProximity({
    values,
    labels,
    ambiguityThreshold: options.ambiguityThreshold,
  });

  const cells: string[][] = [["label", "value"]];
  const flags: PdfCellFlag[] = [];
  const rowProvenance: Array<{ page: number; bbox: BBox }> = [];

  pairs.forEach((pair, index) => {
    cells.push([pair.label, normalizeCellValue(pair.value)]);
    rowProvenance.push({
      page: region.pageIndex,
      bbox: _bboxOf(pair.valueItem),
    });

    if (pair.isAmbiguous) {
      flags.push({
        rowIndex: index,
        columnIndex: 0,
        reason: "ambiguous_association",
        detail:
          `"${pair.value}" was nearly as close to another label ` +
          `(${pair.ambiguityRatio.toFixed(2)} of the winning distance). ` +
          "Check it against the page.",
      });
    }
  });

  for (const unmatched of unmatchedLabels) {
    const rowIndex = cells.length - 1;
    cells.push([unmatched, ""]);
    rowProvenance.push({ page: region.pageIndex, bbox: region.bbox });
    flags.push({
      rowIndex,
      columnIndex: 1,
      reason: "unmatched_label",
      detail: `No value was found near "${unmatched}".`,
    });
  }

  for (const unmatched of unmatchedValues) {
    flags.push({
      rowIndex: -1,
      columnIndex: -1,
      reason: "unmatched_value",
      detail:
        `"${unmatched}" had no label near it, so it was left out. If this ` +
        "is real data, the region may include a legend or an axis.",
    });
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
