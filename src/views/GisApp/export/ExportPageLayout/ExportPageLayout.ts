import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** Margin kept on every edge of the printed page, in millimetres. */
const MARGIN_MM = 12;

/** Width of the landscape legend column, in millimetres. */
const LEGEND_COLUMN_WIDTH_MM = 56;

/** Height of the portrait legend row, in millimetres. */
const LEGEND_ROW_HEIGHT_MM = 44;

/** Height of the header band, in millimetres. */
const HEADER_HEIGHT_MM = 18;

/** Height of the footer band, in millimetres. */
const FOOTER_HEIGHT_MM = 16;

/** Minimum export resolution, in dots per inch. */
const EXPORT_DPI = 200;

/** Millimetres per inch, used to convert map frame size to pixels. */
const MM_PER_INCH = 25.4;

/** Paper dimensions in portrait orientation, in millimetres. */
const PAPER_SIZES_MM = {
  a4: { width: 210, height: 297 },
  letter: { width: 216, height: 279 },
} as const;

/** Rectangle geometry for a printed export page, in millimetres or pixels. */
export type ExportPageGeometry = {
  pageMm: { width: number; height: number };
  mapFrameMm: { x: number; y: number; width: number; height: number };
  legendMm: { x: number; y: number; width: number; height: number };
  headerMm: { x: number; y: number; width: number; height: number };
  footerMm: { x: number; y: number; width: number; height: number };
  mapCanvasPx: { width: number; height: number };
};

/** Returns the page's outer dimensions for the given paper and orientation. */
function _getPageMm(
  paper: AvaMapConfig.ExportPaper,
  orientation: AvaMapConfig.ExportOrientation,
): { width: number; height: number } {
  const portrait = PAPER_SIZES_MM[paper];
  if (orientation === "landscape") {
    return { width: portrait.height, height: portrait.width };
  }
  return portrait;
}

/** Converts a millimetre length to pixels at the fixed export resolution. */
function _mmToPx(mm: number): number {
  return Math.round((mm / MM_PER_INCH) * EXPORT_DPI);
}

/**
 * Lays out the landscape page: legend in a fixed-width right column, map
 * frame absorbing whatever width the paper size leaves over.
 */
function _fromLandscape(pageMm: {
  width: number;
  height: number;
}): Omit<ExportPageGeometry, "pageMm" | "mapCanvasPx"> {
  const contentX = MARGIN_MM;
  const contentY = MARGIN_MM + HEADER_HEIGHT_MM;
  const contentWidth = pageMm.width - 2 * MARGIN_MM;
  const contentHeight =
    pageMm.height - 2 * MARGIN_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM;

  const mapFrameMm = {
    x: contentX,
    y: contentY,
    width: contentWidth - LEGEND_COLUMN_WIDTH_MM,
    height: contentHeight,
  };
  const legendMm = {
    x: mapFrameMm.x + mapFrameMm.width,
    y: contentY,
    width: LEGEND_COLUMN_WIDTH_MM,
    height: contentHeight,
  };
  return {
    mapFrameMm,
    legendMm,
    headerMm: {
      x: MARGIN_MM,
      y: MARGIN_MM,
      width: contentWidth,
      height: HEADER_HEIGHT_MM,
    },
    footerMm: {
      x: MARGIN_MM,
      y: pageMm.height - MARGIN_MM - FOOTER_HEIGHT_MM,
      width: contentWidth,
      height: FOOTER_HEIGHT_MM,
    },
  };
}

/**
 * Lays out the portrait page: legend in a fixed-height row below the map
 * frame, map frame absorbing whatever height the paper size leaves over.
 */
function _fromPortrait(pageMm: {
  width: number;
  height: number;
}): Omit<ExportPageGeometry, "pageMm" | "mapCanvasPx"> {
  const contentX = MARGIN_MM;
  const contentY = MARGIN_MM + HEADER_HEIGHT_MM;
  const contentWidth = pageMm.width - 2 * MARGIN_MM;
  const contentHeight =
    pageMm.height - 2 * MARGIN_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM;

  const mapFrameMm = {
    x: contentX,
    y: contentY,
    width: contentWidth,
    height: contentHeight - LEGEND_ROW_HEIGHT_MM,
  };
  const legendMm = {
    x: contentX,
    y: mapFrameMm.y + mapFrameMm.height,
    width: contentWidth,
    height: LEGEND_ROW_HEIGHT_MM,
  };
  return {
    mapFrameMm,
    legendMm,
    headerMm: {
      x: MARGIN_MM,
      y: MARGIN_MM,
      width: contentWidth,
      height: HEADER_HEIGHT_MM,
    },
    footerMm: {
      x: MARGIN_MM,
      y: pageMm.height - MARGIN_MM - FOOTER_HEIGHT_MM,
      width: contentWidth,
      height: FOOTER_HEIGHT_MM,
    },
  };
}

/**
 * Millimetre page geometry for the map export sheet and PDF.
 *
 * Paper size is not a layout fork: A4 landscape (297x210mm) and US Letter
 * landscape (279x216mm) differ by about 18mm of width and 6mm of height, and
 * that difference is absorbed entirely by the map frame. The legend column
 * (landscape) or legend row (portrait) stays a fixed width or height on every
 * paper size, so a saved export layout never has to describe two legend
 * geometries. Orientation, in contrast, does fork the layout: it moves the
 * legend from a right column (with the north arrow and scale bar at its
 * foot) to a row below the map frame (with the north arrow and scale bar to
 * its right).
 */
export const ExportPageLayout = {
  /** Computes page geometry, in millimetres and pixels, for one export. */
  fromLayout: (
    options: Readonly<{
      paper: AvaMapConfig.ExportPaper;
      orientation: AvaMapConfig.ExportOrientation;
    }>,
  ): ExportPageGeometry => {
    const pageMm = _getPageMm(options.paper, options.orientation);
    const rest =
      options.orientation === "landscape"
        ? _fromLandscape(pageMm)
        : _fromPortrait(pageMm);
    return {
      pageMm,
      ...rest,
      mapCanvasPx: {
        width: _mmToPx(rest.mapFrameMm.width),
        height: _mmToPx(rest.mapFrameMm.height),
      },
    };
  },
};
