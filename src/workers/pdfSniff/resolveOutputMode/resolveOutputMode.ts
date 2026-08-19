import {
  canKeepPrintedColumns,
  getPopulatedTables,
} from "../combineRegions/combineRegions";
import type { ExtractedTable, PdfRegionShape } from "../pdfSniff.types";
import type { PdfOutputMode } from "$/models/datasets/PdfFileDataset/PdfFileDataset.types";

/** Why keeping the printed columns is not on offer. */
export type PdfKeepBlockedReason = "no_rows" | "mixed_columns";

export type PdfOutputModeResolution = {
  /** The mode `combineRegions` must be given. */
  mode: PdfOutputMode;
  /** Whether keeping the printed columns is possible at all. */
  isKeepAvailable: boolean;
  /** Set only when keeping is impossible, and says which case it is. */
  keepBlockedBy: PdfKeepBlockedReason | undefined;
  /** Distinct shapes among the regions that produced rows, in region order. */
  populatedShapes: readonly PdfRegionShape[];
  /** The header row keeping the printed columns would produce. */
  keepColumns: readonly string[];
};

/**
 * Decides what shape a PDF's rows come out in, and whether the user has a say.
 *
 * The default is derived rather than fixed because "keep the printed columns"
 * only describes something real for a `grid_table`: it is the one shape whose
 * columns are read off the page, and the one shape `classifyRegion` only ever
 * returns at `high` confidence. Every other shape has its columns synthesised
 * by its extractor, so defaulting to keeping them asserts something false. A
 * user who drew a box over a line chart was being offered the printed table of
 * a chart, which does not exist.
 *
 * Availability is not our own judgement: it is `canKeepPrintedColumns`, the
 * rule `combineRegions` already unions on. Asking it here is what stops the
 * control from offering a choice the combiner will not honour.
 *
 * `chosenMode` is the user's explicit pick, and is absent when they have not
 * made one. It deliberately loses to an unavailable keep: the combiner would
 * override it anyway, so honouring it here would only let the UI display a
 * mode the dataset does not have.
 */
export function resolveOutputMode(params: {
  tables: readonly ExtractedTable[];
  shapesByRegionId: Readonly<Record<string, PdfRegionShape>>;
  chosenMode: PdfOutputMode | undefined;
}): PdfOutputModeResolution {
  const populated = getPopulatedTables(params.tables);
  const populatedShapes = [
    ...new Set(
      populated.flatMap((table) => {
        const shape = params.shapesByRegionId[table.regionId];
        return shape === undefined ? [] : [shape];
      }),
    ),
  ];
  const keepColumns = populated[0]?.cells[0] ?? [];
  const isKeepAvailable = canKeepPrintedColumns({ tables: params.tables });

  if (!isKeepAvailable) {
    return {
      mode: "observations",
      isKeepAvailable,
      keepBlockedBy: populated.length === 0 ? "no_rows" : "mixed_columns",
      populatedShapes,
      keepColumns,
    };
  }

  const isEveryRegionAPrintedTable =
    populatedShapes.length > 0 &&
    populatedShapes.every((shape) => {
      return shape === "grid_table";
    });

  return {
    mode:
      params.chosenMode ??
      (isEveryRegionAPrintedTable ? "natural" : "observations"),
    isKeepAvailable,
    keepBlockedBy: undefined,
    populatedShapes,
    keepColumns,
  };
}
