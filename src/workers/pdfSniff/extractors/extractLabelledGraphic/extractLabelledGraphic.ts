import { assembleLabels } from "../../assembleLabels/assembleLabels";
import { assembleQuantities } from "../../assembleQuantities/assembleQuantities";
import { pairByProximity } from "../../pairByProximity/pairByProximity";
import type {
  BBox,
  ExtractedTable,
  PdfCellFlag,
  PdfValueUnit,
  RegionGeometry,
} from "../../pdfSniff.types";

/**
 * Reads a map, chart or KPI tile whose values are text at coordinates.
 *
 * The PDF records no link between a figure and its caption, so the pairing has
 * to be recovered geometrically. Everything uncertain is flagged rather than
 * dropped or silently resolved, because the measurement behind this extractor
 * showed that roughly one pair in eight is a near-tie and roughly one in
 * sixteen is simply wrong.
 *
 * Figures are assembled before labels are, because a magnitude suffix left
 * loose becomes a label in its own right and then wins the figure printed
 * beside it. See `assembleQuantities`.
 */
export function extractLabelledGraphic(
  region: RegionGeometry,
  options: { regionId: string; ambiguityThreshold?: number },
): ExtractedTable {
  const { quantities, labelItems } = assembleQuantities(region.textItems);
  const byItem = new Map(
    quantities.map((quantity) => {
      return [quantity.item, quantity];
    }),
  );

  const labels = assembleLabels(labelItems);
  const { pairs, unmatchedLabels, unmatchedValues } = pairByProximity({
    values: quantities.map((quantity) => {
      return quantity.item;
    }),
    labels,
    ambiguityThreshold: options.ambiguityThreshold,
  });

  const cells: string[][] = [["label", "value"]];
  const flags: PdfCellFlag[] = [];
  const rowProvenance: Array<{ page: number; bbox: BBox }> = [];
  const rowUnits: Array<PdfValueUnit | undefined> = [];

  pairs.forEach((pair, index) => {
    const quantity = byItem.get(pair.valueItem);
    cells.push([pair.label, quantity?.value ?? ""]);
    rowUnits.push(quantity?.unit);
    rowProvenance.push({
      page: region.pageIndex,
      bbox: quantity?.bbox ?? region.bbox,
    });

    if (pair.isAmbiguous) {
      flags.push({
        rowIndex: index,
        columnIndex: 0,
        reason: "ambiguous_association",
        detail:
          `"${quantity?.text ?? pair.value}" was nearly as close to another ` +
          `label (${pair.ambiguityRatio.toFixed(2)} of the winning ` +
          "distance). Check it against the page.",
      });
    }
  });

  for (const unmatched of unmatchedLabels) {
    const rowIndex = cells.length - 1;
    cells.push([unmatched, ""]);
    rowProvenance.push({ page: region.pageIndex, bbox: region.bbox });
    // No figure, so nothing to give a unit to. `undefined` keeps the array
    // parallel to the rows, which is the whole contract of `rowUnits`.
    rowUnits.push(undefined);
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
    rowUnits,
  };
}
