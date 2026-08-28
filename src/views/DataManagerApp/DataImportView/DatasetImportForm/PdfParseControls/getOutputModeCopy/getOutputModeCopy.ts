import { msg } from "@lingui/core/macro";
import { match } from "ts-pattern";
import type { GraphicType } from "@/workers/pdfSniff/detectGraphicType/detectGraphicType";
import type { PdfRegionShape } from "@/workers/pdfSniff/pdfSniff.types";
import type { PdfOutputModeResolution } from "@/workers/pdfSniff/resolveOutputMode/resolveOutputMode";
import type { I18n } from "@lingui/core";

export type OutputModeCopy = {
  /** Heading for the group, naming what was detected. */
  groupLabel: string;
  keepLabel: string;
  /** The columns keeping the printed ones would produce. */
  keepDescription: string;
  normaliseLabel: string;
  normaliseDescription: string;
  /**
   * Why the keep option is unavailable, or how the shape was chosen. Empty
   * when the user picked the shape themselves, because there is then nothing
   * to explain: they know why it is what it is.
   */
  note: string;
};

/** How many observation columns to name before summarising the rest. */
const NAMED_OBSERVATION_COLUMNS = 4;

function _columnList(columns: readonly string[]): string {
  return columns.join(", ");
}

/**
 * The one detected shape to speak in, or undefined when they differ.
 *
 * A document whose regions were read as different things has no single shape
 * to name, and inventing one would put a word in front of the user that is
 * true of only part of what they selected.
 */
function _getSingleShape(
  shapes: readonly PdfRegionShape[],
): PdfRegionShape | undefined {
  return shapes.length === 1 ? shapes[0] : undefined;
}

/** Whether the detector recognised the graphic as a chart specifically. */
function _isChart(graphicKind: GraphicType | undefined): boolean {
  return graphicKind !== undefined && graphicKind !== "unknown";
}

function _getGroupLabel(options: {
  i18n: I18n;
  shape: PdfRegionShape | undefined;
  graphicKind: GraphicType | undefined;
  regionCount: number;
}): string {
  const { i18n, shape, graphicKind, regionCount } = options;
  if (shape === undefined) {
    return i18n._(msg`Rows from these ${regionCount} regions`);
  }
  return match(shape)
    .with("grid_table", () => {
      return i18n._(msg`Rows from this table`);
    })
    .with("labelled_graphic", () => {
      return _isChart(graphicKind)
        ? i18n._(msg`Rows from this chart`)
        : i18n._(msg`Rows from this graphic`);
    })
    .with("repeating_blocks", () => {
      return i18n._(msg`Rows from these blocks`);
    })
    .with("prose_measures", () => {
      return i18n._(msg`Rows from this text`);
    })
    .exhaustive();
}

function _getKeepLabel(i18n: I18n, shape: PdfRegionShape | undefined): string {
  if (shape === undefined) {
    return i18n._(msg`Keep the printed columns`);
  }
  return match(shape)
    .with("grid_table", () => {
      return i18n._(msg`Keep the table's columns`);
    })
    .with("labelled_graphic", () => {
      return i18n._(msg`Readings only`);
    })
    .with("repeating_blocks", () => {
      return i18n._(msg`Keep the block fields`);
    })
    .with("prose_measures", () => {
      return i18n._(msg`Keep the measurements as found`);
    })
    .exhaustive();
}

/**
 * What the normalising option is called.
 *
 * A chart's rows are already one per reading, so calling it "one row per
 * number" there would describe a change that does not happen: the only
 * difference is the columns it adds. Every other shape really is reshaped.
 */
function _getNormaliseLabel(
  i18n: I18n,
  shape: PdfRegionShape | undefined,
): string {
  return shape === "labelled_graphic"
    ? i18n._(msg`Readings with source columns`)
    : i18n._(msg`One row per number`);
}

function _getNote(options: {
  i18n: I18n;
  resolution: PdfOutputModeResolution;
  isUserChosen: boolean;
  regionNames: readonly string[];
}): string {
  const { i18n, resolution, isUserChosen, regionNames } = options;
  if (resolution.keepBlockedBy === "no_rows") {
    return i18n._(
      msg`None of the selected regions produced any rows yet, so there are no printed columns to keep.`,
    );
  }
  if (resolution.keepBlockedBy === "mixed_columns") {
    return i18n._(
      msg`${_columnList(regionNames)} print different columns, so there is no shared set of columns to keep and every number goes on its own row. Remove a region, or change what one is read as, to get the choice back.`,
    );
  }
  return isUserChosen
    ? ""
    : i18n._(msg`Chosen from what we detected. Switch it if that reads wrong.`);
}

/**
 * Names the two row shapes on offer in the words of what was detected.
 *
 * The labels have to come from the detected shape because the choice does not
 * mean the same thing twice: for a table it is a reshape from wide to long, and
 * for a chart the rows are already long and only the columns change. The
 * descriptions are read off the extracted header rather than written here, so
 * they cannot claim a column the dataset does not have.
 */
export function getOutputModeCopy(options: {
  i18n: I18n;
  resolution: PdfOutputModeResolution;
  observationColumns: readonly string[];
  graphicKind: GraphicType | undefined;
  isUserChosen: boolean;
  regionNames: readonly string[];
}): OutputModeCopy {
  const { i18n, resolution, observationColumns, graphicKind } = options;
  const shape = _getSingleShape(resolution.populatedShapes);
  const namedColumns = observationColumns.slice(0, NAMED_OBSERVATION_COLUMNS);
  const remainingCount = Math.max(
    0,
    observationColumns.length - namedColumns.length,
  );

  return {
    groupLabel: _getGroupLabel({
      i18n,
      shape,
      graphicKind,
      regionCount: options.regionNames.length,
    }),
    keepLabel: _getKeepLabel(i18n, shape),
    keepDescription:
      resolution.keepColumns.length > 0
        ? _columnList(resolution.keepColumns)
        : i18n._(msg`No columns yet`),
    normaliseLabel: _getNormaliseLabel(i18n, shape),
    normaliseDescription:
      remainingCount > 0
        ? i18n._(
            msg`${_columnList(namedColumns)}, and ${remainingCount} more naming the page and the document`,
          )
        : _columnList(namedColumns),
    note: _getNote({
      i18n,
      resolution,
      isUserChosen: options.isUserChosen,
      regionNames: options.regionNames,
    }),
  };
}
