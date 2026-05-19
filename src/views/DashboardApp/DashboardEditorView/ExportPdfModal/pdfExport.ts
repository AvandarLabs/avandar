/**
 * Capture-to-PDF helpers used by the Export PDF flow.
 *
 * The dashboard is rendered into an off-screen container via
 * `<PuckPageRender>`. We use `html2canvas` to snapshot that container into a
 * single tall canvas, then split it across portrait letter-size PDF pages
 * with `jspdf`.
 */
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const PDF_WIDTH_PT = 612; // 8.5" * 72
const PDF_HEIGHT_PT = 792; // 11"  * 72
const PAGE_MARGIN_PT = 28;

export type CaptureOptions = {
  element: HTMLElement;
  /**
   * When provided, the annotation canvas is composited on top of the base
   * snapshot before paginating. The annotation canvas must already be sized
   * to match the captured element 1:1.
   */
  annotationCanvas?: HTMLCanvasElement;
  filename: string;
  title: string;
};

/**
 * Snapshot the source element into a canvas, optionally composite an
 * annotation canvas on top, paginate the result across letter-sized PDF
 * pages, and trigger a download.
 */
export async function captureAndDownloadPdf(
  options: CaptureOptions,
): Promise<void> {
  const baseCanvas = await snapshotElement(options.element);
  const finalCanvas = options.annotationCanvas ?
      composite(baseCanvas, options.annotationCanvas)
    : baseCanvas;

  const doc = new jsPDF({
    unit: "pt",
    format: "letter",
    orientation: "portrait",
  });

  doc.setProperties({ title: options.title });
  paginate(doc, finalCanvas);
  doc.save(options.filename);
}

/**
 * Capture an element to a single tall canvas. Exposed so the annotator can
 * reuse the same base snapshot without re-rendering.
 */
export async function snapshotElement(
  element: HTMLElement,
): Promise<HTMLCanvasElement> {
  return await html2canvas(element, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
    // Lift the off-screen element into the layout origin for measurement.
    // We don't actually move it on screen; html2canvas computes layout
    // from the source position automatically.
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });
}

function composite(
  base: HTMLCanvasElement,
  overlay: HTMLCanvasElement,
): HTMLCanvasElement {
  const out = document.createElement("canvas");
  out.width = base.width;
  out.height = base.height;
  const ctx = out.getContext("2d");
  if (!ctx) throw new Error("Couldn't get 2d context for compositing.");
  ctx.drawImage(base, 0, 0);
  // Overlay canvas is annotation-space; scale to match base.
  ctx.drawImage(overlay, 0, 0, base.width, base.height);
  return out;
}

function paginate(doc: jsPDF, canvas: HTMLCanvasElement): void {
  const usableWidthPt = PDF_WIDTH_PT - PAGE_MARGIN_PT * 2;
  const usableHeightPt = PDF_HEIGHT_PT - PAGE_MARGIN_PT * 2;

  // Map the canvas pixel-width to the usable page width.
  const scale = usableWidthPt / canvas.width;
  const totalScaledHeightPt = canvas.height * scale;

  if (totalScaledHeightPt <= usableHeightPt) {
    // Single page
    const imgData = canvas.toDataURL("image/png");
    doc.addImage(
      imgData,
      "PNG",
      PAGE_MARGIN_PT,
      PAGE_MARGIN_PT,
      usableWidthPt,
      totalScaledHeightPt,
    );
    return;
  }

  // Multi-page: slice the canvas vertically into page-sized chunks.
  const pageSliceHeightPx = Math.floor(usableHeightPt / scale);
  let cursorPx = 0;
  let pageIdx = 0;
  while (cursorPx < canvas.height) {
    const sliceHeight = Math.min(pageSliceHeightPx, canvas.height - cursorPx);
    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeight;
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) throw new Error("Couldn't get 2d context for page slice.");
    ctx.drawImage(
      canvas,
      0,
      cursorPx,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight,
    );
    const sliceImg = sliceCanvas.toDataURL("image/png");
    if (pageIdx > 0) doc.addPage();
    doc.addImage(
      sliceImg,
      "PNG",
      PAGE_MARGIN_PT,
      PAGE_MARGIN_PT,
      usableWidthPt,
      sliceHeight * scale,
    );
    cursorPx += sliceHeight;
    pageIdx += 1;
  }
}
