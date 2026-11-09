import type { ExportTextMeasurer } from "@/views/GisApp/export/composeExportPdf/drawExportFeatureTable/drawExportFeatureTable";
import type jsPDF from "jspdf";

/** Switches the document to Helvetica at the given size and weight. */
function _useFont(
  options: Readonly<{ document: jsPDF; fontSizePt: number; isBold: boolean }>,
): void {
  const { document, fontSizePt, isBold } = options;
  document.setFontSize(fontSizePt);
  document.setFont("helvetica", isBold ? "bold" : "normal");
}

/**
 * Measures and wraps text with jsPDF's own Helvetica metrics, so what the
 * table layout measures is exactly what the document prints. Each call sets
 * the weight it measures in and puts the regular weight back afterwards.
 */
export function createPdfTextMeasurer(
  options: Readonly<{ document: jsPDF; fontSizePt: number }>,
): ExportTextMeasurer {
  const { document, fontSizePt } = options;
  return {
    wrapText: (text, widthMm, { isBold }) => {
      _useFont({ document, fontSizePt, isBold });
      const lines: unknown = document.splitTextToSize(text, widthMm);
      _useFont({ document, fontSizePt, isBold: false });
      return Array.isArray(lines) ? lines.map(String) : [String(lines)];
    },
    getTextWidthMm: (text, { isBold }) => {
      _useFont({ document, fontSizePt, isBold });
      const widthMm = document.getTextWidth(text);
      _useFont({ document, fontSizePt, isBold: false });
      return widthMm;
    },
  };
}
