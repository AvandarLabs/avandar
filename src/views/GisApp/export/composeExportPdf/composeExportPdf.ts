import jsPDF from "jspdf";
import { match } from "ts-pattern";
import {
  drawExportLegend,
  type ExportLegendEntry,
} from "@/views/GisApp/export/composeExportPdf/drawExportLegend/drawExportLegend";
import { DisputedBoundary } from "@/views/GisApp/layers/DisputedBoundary/DisputedBoundary";
import type { ExportFurnitureText } from "@/views/GisApp/export/getExportFurnitureText/getExportFurnitureText";
import type { ExportPageGeometry } from "@/views/GisApp/export/ExportPageLayout/ExportPageLayout";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

/** A millimetre rectangle on the printed page. */
type RectMm = Readonly<{ x: number; y: number; width: number; height: number }>;

/** Page background and text ink, hardcoded regardless of the app theme. */
const PAGE_BACKGROUND = "#ffffff";
const INK_COLOR = "#111111";

/** Font sizes, in points, for the header title and every other band. */
const TITLE_FONT_SIZE_PT = 16;
const BODY_FONT_SIZE_PT = 9;

/** Vertical gap between stacked text lines within a band, in millimetres. */
const LINE_GAP_MM = 5;

/** Everything the page prints, already resolved. */
export type ExportPdfInput = {
  canvas: HTMLCanvasElement;
  page: ExportPageGeometry;
  layout: AvaMapConfig.ExportLayout;
  text: ExportFurnitureText;
  workspaceName: string;
  disclaimer: string;
  filterReadoutLines: readonly string[];
  legendEntries: readonly ExportLegendEntry[];
  hasDrawnDisputedFeature: boolean;
  disputedLegendLabel: string;
  scaleLabel: string | undefined;
  producedAtLabel: string;
  filename: string;
  pageNumberLabel: (options: { page: number; total: number }) => string;
};

/**
 * Appends the locked disputed row, when required, as the legend's last
 * entry. It is reflowed by `drawExportLegend` like any other entry, so it is
 * never dropped by the fitting logic.
 */
function _getLegendEntries(
  input: Readonly<ExportPdfInput>,
): ExportLegendEntry[] {
  if (!input.hasDrawnDisputedFeature) {
    return [...input.legendEntries];
  }
  return [
    ...input.legendEntries,
    {
      label: input.disputedLegendLabel,
      swatch: {
        type: "line",
        color: DisputedBoundary.casingColors.light,
        isDashed: true,
      },
    },
  ];
}

/** Paints the page's light background over the full sheet. */
function _paintPageBackground(
  document: jsPDF,
  pageMm: Readonly<{ width: number; height: number }>,
): void {
  document.setFillColor(PAGE_BACKGROUND);
  document.rect(0, 0, pageMm.width, pageMm.height, "F");
}

/** Draws the title, subtitle, workspace name, and production date. */
function _drawHeader(
  document: jsPDF,
  options: Readonly<{ block: RectMm; input: ExportPdfInput }>,
): void {
  const { block, input } = options;
  document.setTextColor(INK_COLOR);
  document.setFontSize(TITLE_FONT_SIZE_PT);
  if (input.text.title !== undefined) {
    document.text(input.text.title, block.x, block.y + LINE_GAP_MM);
  }
  document.setFontSize(BODY_FONT_SIZE_PT);
  const lines = [
    input.text.subtitle,
    input.workspaceName,
    input.producedAtLabel,
  ].filter((line): line is string => {
    return line !== undefined;
  });
  lines.forEach((line, index) => {
    document.text(line, block.x, block.y + LINE_GAP_MM * (2 + index));
  });
}

/** Draws the footer's source line, disclaimer, and filter readout. */
function _drawFooter(
  document: jsPDF,
  options: Readonly<{ block: RectMm; input: ExportPdfInput }>,
): void {
  const { block, input } = options;
  const lines = [
    input.text.sourceLine,
    input.disclaimer,
    ...input.filterReadoutLines,
  ];
  document.setTextColor(INK_COLOR);
  document.setFontSize(BODY_FONT_SIZE_PT);
  lines.forEach((line, index) => {
    document.text(line, block.x, block.y + LINE_GAP_MM * (1 + index));
  });
}

/** Draws the page number label at the footer's trailing edge, when shown. */
function _drawPageNumber(
  document: jsPDF,
  options: Readonly<{
    block: RectMm;
    input: ExportPdfInput;
    page: number;
    total: number;
  }>,
): void {
  const { block, input, page, total } = options;
  if (total <= 1) {
    return;
  }
  document.setTextColor(INK_COLOR);
  document.setFontSize(BODY_FONT_SIZE_PT);
  document.text(
    input.pageNumberLabel({ page, total }),
    block.x,
    block.y + block.height,
  );
}

/** Draws one legend swatch at its reflowed position. */
function _drawLegendSwatch(
  document: jsPDF,
  options: Readonly<{ entry: ExportLegendEntry; xMm: number; yMm: number }>,
): void {
  const { entry, xMm, yMm } = options;
  const swatchSizeMm = 4;
  match(entry.swatch)
    .with({ type: "fill" }, (swatch) => {
      document.setFillColor(swatch.color);
      document.rect(xMm, yMm, swatchSizeMm, swatchSizeMm, "F");
    })
    .with({ type: "line" }, (swatch) => {
      document.setDrawColor(swatch.color);
      document.setLineDashPattern(swatch.isDashed ? [1, 1] : [], 0);
      document.line(
        xMm,
        yMm + swatchSizeMm / 2,
        xMm + swatchSizeMm,
        yMm + swatchSizeMm / 2,
      );
    })
    .with({ type: "circle" }, (swatch) => {
      document.setFillColor(swatch.color);
      const radiusMm = Math.min(2, Math.max(0.8, swatch.radiusPx / 20));
      document.circle(
        xMm + swatchSizeMm / 2,
        yMm + swatchSizeMm / 2,
        radiusMm,
        "F",
      );
    })
    .exhaustive();
}

/** Draws every legend row's swatch and label. */
function _drawLegendRows(
  document: jsPDF,
  rows: ReadonlyArray<{ entry: ExportLegendEntry; xMm: number; yMm: number }>,
): void {
  document.setFontSize(BODY_FONT_SIZE_PT);
  rows.forEach((row) => {
    _drawLegendSwatch(document, {
      entry: row.entry,
      xMm: row.xMm,
      yMm: row.yMm,
    });
    document.setTextColor(INK_COLOR);
    document.text(row.entry.label, row.xMm + 6, row.yMm + 3.5);
  });
}

/** Draws the north arrow at the legend block's foot or right, when shown. */
function _drawNorthArrow(
  document: jsPDF,
  options: Readonly<{ block: RectMm; layout: AvaMapConfig.ExportLayout }>,
): void {
  const { block, layout } = options;
  if (!layout.northArrow) {
    return;
  }
  const x = block.x + block.width / 2;
  const yBase = block.y + block.height - 4;
  document.setDrawColor(INK_COLOR);
  document.line(x, yBase, x, yBase - 6);
  document.setTextColor(INK_COLOR);
  document.setFontSize(BODY_FONT_SIZE_PT);
  document.text("N", x + 2, yBase - 6);
}

/** Draws the scale bar's label at the legend block's foot, when shown. */
function _drawScaleBar(
  document: jsPDF,
  options: Readonly<{
    block: RectMm;
    layout: AvaMapConfig.ExportLayout;
    scaleLabel: string | undefined;
  }>,
): void {
  const { block, layout, scaleLabel } = options;
  if (!layout.scaleBar || scaleLabel === undefined) {
    return;
  }
  document.setTextColor(INK_COLOR);
  document.setFontSize(BODY_FONT_SIZE_PT);
  document.text(scaleLabel, block.x, block.y + block.height - 1);
}

/** The header-to-footer rectangle used for the legend's full-page redraw. */
function _getFullPageLegendBlock(page: ExportPageGeometry): RectMm {
  return {
    x: page.headerMm.x,
    y: page.headerMm.y,
    width: page.headerMm.width,
    height: page.footerMm.y - page.headerMm.y,
  };
}

/**
 * Draws the legend (rows plus north arrow and scale bar) into the given
 * block, assuming its entries already fit that block.
 */
function _drawLegendBlock(
  document: jsPDF,
  options: Readonly<{
    block: RectMm;
    rows: ReadonlyArray<{ entry: ExportLegendEntry; xMm: number; yMm: number }>;
    layout: AvaMapConfig.ExportLayout;
    scaleLabel: string | undefined;
  }>,
): void {
  const { block, rows, layout, scaleLabel } = options;
  _drawLegendRows(document, rows);
  _drawNorthArrow(document, { block, layout });
  _drawScaleBar(document, { block, layout, scaleLabel });
}

/**
 * Draws the header, map image, footer, and (when the legend fits) the
 * legend block onto the current page.
 */
function _composePrimaryPage(
  document: jsPDF,
  options: Readonly<{
    input: ExportPdfInput;
    fit: ReturnType<typeof drawExportLegend>;
    totalPages: number;
  }>,
): void {
  const { input, fit, totalPages } = options;
  _paintPageBackground(document, input.page.pageMm);
  _drawHeader(document, { block: input.page.headerMm, input });
  document.addImage(
    input.canvas.toDataURL("image/png"),
    "PNG",
    input.page.mapFrameMm.x,
    input.page.mapFrameMm.y,
    input.page.mapFrameMm.width,
    input.page.mapFrameMm.height,
  );
  if (fit.fitsOnPage) {
    _drawLegendBlock(document, {
      block: input.page.legendMm,
      rows: fit.rows,
      layout: input.layout,
      scaleLabel: input.scaleLabel,
    });
  }
  _drawFooter(document, { block: input.page.footerMm, input });
  _drawPageNumber(document, {
    block: input.page.footerMm,
    input,
    page: 1,
    total: totalPages,
  });
}

/**
 * Adds a second page sized to the full header-to-footer span and redraws
 * the legend there, in full, when it did not fit alongside the map.
 */
function _composeOverflowPage(
  document: jsPDF,
  options: Readonly<{
    input: ExportPdfInput;
    entries: readonly ExportLegendEntry[];
    totalPages: number;
  }>,
): void {
  const { input, entries, totalPages } = options;
  document.addPage();
  _paintPageBackground(document, input.page.pageMm);
  const fullPageBlock = _getFullPageLegendBlock(input.page);
  const fullFit = drawExportLegend({ block: fullPageBlock, entries });
  if (!fullFit.fitsOnPage) {
    throw new Error("The export legend does not fit on a page");
  }
  _drawLegendBlock(document, {
    block: fullPageBlock,
    rows: fullFit.rows,
    layout: input.layout,
    scaleLabel: input.scaleLabel,
  });
  _drawPageNumber(document, {
    block: input.page.footerMm,
    input,
    page: 2,
    total: totalPages,
  });
}

/**
 * Composes the map snapshot and furniture into a PDF and saves it.
 *
 * Every displayable string arrives already localized: this module runs
 * outside React and must not reach for a Lingui hook. The page is always
 * painted with hardcoded light surfaces, regardless of the app's theme.
 *
 * The map frame is drawn at `input.page.mapFrameMm` no matter how the legend
 * fits, so it is never shrunk. When the legend's entries do not fit
 * `input.page.legendMm`, the whole legend (never a truncated slice of it)
 * moves to a second page sized to the full header-to-footer span, and both
 * pages' footers gain a page number. `document.save()` is the last call in
 * the happy path, so a throw anywhere above it leaves no file written.
 */
export async function composeExportPdf(
  input: Readonly<ExportPdfInput>,
): Promise<void> {
  const entries = _getLegendEntries(input);
  const fit = drawExportLegend({ block: input.page.legendMm, entries });
  const totalPages = fit.fitsOnPage ? 1 : 2;

  const document = new jsPDF({
    unit: "mm",
    format: input.layout.paper,
    orientation: input.layout.orientation,
  });
  document.setProperties({ title: input.text.title ?? "" });

  _composePrimaryPage(document, { input, fit, totalPages });
  if (!fit.fitsOnPage) {
    _composeOverflowPage(document, { input, entries, totalPages });
  }

  document.save(input.filename);
}
