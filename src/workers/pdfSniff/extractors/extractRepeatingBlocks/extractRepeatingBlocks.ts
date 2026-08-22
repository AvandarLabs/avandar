import type {
  BBox,
  ExtractedTable,
  PdfCellFlag,
  RegionGeometry,
} from "../../pdfSniff.types";

import { groupLines } from "../../groupLines/groupLines";
import { parseRunInLabels } from "../../parseRunInLabels/parseRunInLabels";

/**
 * Reads numbered sections with run-in labels into one row per section.
 *
 * Columns are the union of every field label seen, in order of first
 * appearance rather than alphabetical, because the document's own order
 * (Responses, then Challenges, then Priorities) is meaningful and sorting
 * would scramble it.
 */
export function extractRepeatingBlocks(
  region: RegionGeometry,
  options: { regionId: string },
): ExtractedTable {
  const blocks = parseRunInLabels(groupLines(region.textItems));

  if (blocks.length === 0) {
    return {
      regionId: options.regionId,
      cells: [],
      headerRows: 0,
      flags: [
        {
          rowIndex: -1,
          columnIndex: -1,
          reason: "unmatched_value",
          detail:
            "No numbered headings with run-in labels were found in this region. If the text is a plain paragraph, try reading it as prose measurements instead.",
        },
      ],
      extractedBy: "rules",
      rowProvenance: [],
    };
  }

  const fieldNames: string[] = [];
  for (const block of blocks) {
    for (const name of Object.keys(block.fields)) {
      if (!fieldNames.includes(name)) {
        fieldNames.push(name);
      }
    }
  }

  const header = ["number", "heading", ...fieldNames];
  const cells: string[][] = [header];
  const flags: PdfCellFlag[] = [];
  const rowProvenance: Array<{ page: number; bbox: BBox }> = [];

  blocks.forEach((block, index) => {
    cells.push([
      block.number === null ? "" : String(block.number),
      block.heading,
      // An absent field is an empty string in its own column, never a
      // shift. Shifting would silently relabel every value to its right.
      ...fieldNames.map((name) => {
        return block.fields[name] ?? "";
      }),
    ]);
    rowProvenance.push({ page: region.pageIndex, bbox: region.bbox });

    fieldNames.forEach((name, columnOffset) => {
      if (block.fields[name] === undefined) {
        flags.push({
          rowIndex: index,
          columnIndex: 2 + columnOffset,
          reason: "unmatched_label",
          detail: `"${block.heading}" has no ${name} section.`,
        });
      }
    });
  });

  return {
    regionId: options.regionId,
    cells,
    headerRows: 1,
    flags,
    extractedBy: "rules",
    rowProvenance,
  };
}
