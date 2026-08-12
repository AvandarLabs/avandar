import { makeArrayWithLength } from "@avandar/utils";
import { toCanvas } from "html-to-image";
import jsPDF from "jspdf";

const PDF_WIDTH_PT = 612;
const PDF_HEIGHT_PT = 792;
const PAGE_MARGIN_PT = 28;

export type CaptureOptions = {
  element: HTMLElement;
  /** Canvas composited over the captured dashboard before pagination. */
  annotationCanvas?: HTMLCanvasElement;
  filename: string;
  title: string;
};

type CompositeOptions = {
  baseCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
};

type AddPageSliceOptions = {
  document: jsPDF;
  canvas: HTMLCanvasElement;
  sliceIndex: number;
  pageSliceHeightPx: number;
  scale: number;
};

async function _captureAndDownloadPdf(
  options: Readonly<CaptureOptions>,
): Promise<void> {
  const baseCanvas = await _snapshotElement(options.element);
  const finalCanvas =
    options.annotationCanvas ?
      _composite({
        baseCanvas,
        overlayCanvas: options.annotationCanvas,
      })
    : baseCanvas;
  const document = new jsPDF({
    unit: "pt",
    format: "letter",
    orientation: "portrait",
  });

  document.setProperties({ title: options.title });
  _paginate({ document, canvas: finalCanvas });
  document.save(options.filename);
}

async function _snapshotElement(
  element: HTMLElement,
): Promise<HTMLCanvasElement> {
  return await toCanvas(element, {
    width: element.scrollWidth,
    height: element.scrollHeight,
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: "#ffffff",
    // Cross-origin font stylesheets can reject cssRules access. The capture
    // uses system-font fallbacks when fonts cannot be embedded safely.
    skipFonts: true,
    // The source is rendered off-screen. Reset its position in the cloned
    // SVG so the browser paints it at the capture origin.
    style: {
      position: "static",
      top: "auto",
      left: "auto",
      transform: "none",
    },
  });
}

function _composite(options: Readonly<CompositeOptions>): HTMLCanvasElement {
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = options.baseCanvas.width;
  outputCanvas.height = options.baseCanvas.height;
  const canvasContext = outputCanvas.getContext("2d");
  if (!canvasContext) {
    throw new Error("Couldn't get 2d context for compositing.");
  }
  canvasContext.drawImage(options.baseCanvas, 0, 0);
  canvasContext.drawImage(
    options.overlayCanvas,
    0,
    0,
    options.baseCanvas.width,
    options.baseCanvas.height,
  );
  return outputCanvas;
}

function _paginate(
  options: Readonly<{ document: jsPDF; canvas: HTMLCanvasElement }>,
): void {
  const usableWidthPt = PDF_WIDTH_PT - PAGE_MARGIN_PT * 2;
  const usableHeightPt = PDF_HEIGHT_PT - PAGE_MARGIN_PT * 2;
  const scale = usableWidthPt / options.canvas.width;
  const totalScaledHeightPt = options.canvas.height * scale;

  if (totalScaledHeightPt <= usableHeightPt) {
    options.document.addImage(
      options.canvas.toDataURL("image/png"),
      "PNG",
      PAGE_MARGIN_PT,
      PAGE_MARGIN_PT,
      usableWidthPt,
      totalScaledHeightPt,
    );
    return;
  }

  const pageSliceHeightPx = Math.floor(usableHeightPt / scale);
  const numPages = Math.ceil(options.canvas.height / pageSliceHeightPx);
  makeArrayWithLength(numPages).forEach((_, sliceIndex) => {
    _addPageSlice({
      document: options.document,
      canvas: options.canvas,
      sliceIndex,
      pageSliceHeightPx,
      scale,
    });
  });
}

function _addPageSlice(options: Readonly<AddPageSliceOptions>): void {
  const cursorPx = options.sliceIndex * options.pageSliceHeightPx;
  const sliceHeight = Math.min(
    options.pageSliceHeightPx,
    options.canvas.height - cursorPx,
  );
  const sliceCanvas = document.createElement("canvas");
  sliceCanvas.width = options.canvas.width;
  sliceCanvas.height = sliceHeight;
  const canvasContext = sliceCanvas.getContext("2d");
  if (!canvasContext) {
    throw new Error("Couldn't get 2d context for page slice.");
  }
  canvasContext.drawImage(
    options.canvas,
    0,
    cursorPx,
    options.canvas.width,
    sliceHeight,
    0,
    0,
    options.canvas.width,
    sliceHeight,
  );
  if (options.sliceIndex > 0) {
    options.document.addPage();
  }
  options.document.addImage(
    sliceCanvas.toDataURL("image/png"),
    "PNG",
    PAGE_MARGIN_PT,
    PAGE_MARGIN_PT,
    PDF_WIDTH_PT - PAGE_MARGIN_PT * 2,
    sliceHeight * options.scale,
  );
}

/** Captures dashboards and downloads paginated PDF documents. */
export const PdfExport = {
  /** Captures an element, composites annotations, and downloads the PDF. */
  captureAndDownloadPdf: _captureAndDownloadPdf,
  /** Captures an element as a single canvas. */
  snapshotElement: _snapshotElement,
};
