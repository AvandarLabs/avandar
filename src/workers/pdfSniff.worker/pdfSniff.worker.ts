/**
 * Worker that reads a PDF's page geometry, and extracts the regions a user
 * has selected, without blocking the main thread.
 *
 * Lifecycle: main thread sends either
 * `{ type: "sniff", file, pageRange?, password? }`, for which the worker posts
 * zero or more `progress` messages then one `result` or `error`; or
 * `{ type: "extract", pages, regions, documentMetadata, outputMode? }`, for
 * which it posts one `extract_result`. Either way it closes afterwards. One
 * worker per request, matching `xlsxSniff.worker.ts`.
 *
 * Why this is a worker: reading every page's text and operator list is, for a
 * 200-page statistical publication, seconds of pure JS. On the main thread
 * that freezes input and animation. Extraction is here for the same reason: a
 * region on a dense page is thousands of text items, and classifying it and
 * then reading it is real work.
 */
import { match } from "ts-pattern";
import { classifyRegion } from "../pdfSniff/classifyRegion/classifyRegion";
import { clipToRegion } from "../pdfSniff/clipToRegion/clipToRegion";
import { combineRegions } from "../pdfSniff/combineRegions/combineRegions";
import { detectTextLayer } from "../pdfSniff/detectTextLayer/detectTextLayer";
import { extractDocumentMetadata } from "../pdfSniff/extractDocumentMetadata/extractDocumentMetadata";
import { extractGridTable } from "../pdfSniff/extractors/extractGridTable/extractGridTable";
import { extractLabelledGraphic } from "../pdfSniff/extractors/extractLabelledGraphic/extractLabelledGraphic";
import { extractProseMeasures } from "../pdfSniff/extractors/extractProseMeasures/extractProseMeasures";
import { extractRepeatingBlocks } from "../pdfSniff/extractors/extractRepeatingBlocks/extractRepeatingBlocks";
import { extractPageGeometry } from "../pdfSniff/extractPageGeometry/extractPageGeometry";
import { loadPdfDocument } from "../pdfSniff/loadPdfDocument/loadPdfDocument";
import type { RegionClassification } from "../pdfSniff/classifyRegion/classifyRegion";
import type { CombinedTable } from "../pdfSniff/combineRegions/combineRegions";
import type {
  DocumentMetadata,
  ExtractedTable,
  PageGeometry,
  PdfRegion,
  PdfRegionShape,
  RegionGeometry,
} from "../pdfSniff/pdfSniff.types";

/**
 * Hard cap on pages read when the user has not chosen a range. Beyond this we
 * stop and ask for a range rather than grinding for a minute.
 */
const MAX_PAGES_WITHOUT_RANGE = 50;

type SniffRequest = {
  type: "sniff";
  file: File;
  /** Inclusive, one-based, as the user would type it. */
  pageRange?: readonly [number, number];
  password?: string;
};

/**
 * Re-reads nothing. The geometry the sniff already produced is sent back in,
 * because the user re-extracts every time they nudge a box or change a
 * shape, and re-parsing the document for that would make the UI feel broken.
 */
type ExtractRequest = {
  type: "extract";
  pages: readonly PageGeometry[];
  regions: readonly PdfRegion[];
  documentMetadata: DocumentMetadata;
  outputMode?: "natural" | "observations";
};

type PdfWorkerRequest = SniffRequest | ExtractRequest;

export type PdfSniffResult = {
  type: "result";
  pageCount: number;
  /** Geometry for the pages actually read, in page order. */
  pages: readonly PageGeometry[];
  /**
   * The document's identity, read once here rather than on every extract. It
   * depends on the document rather than on any region, so re-reading page one
   * each time a box moves would be wasted work.
   */
  documentMetadata: DocumentMetadata;
};

export type PdfExtractResult = {
  type: "extract_result";
  /** One per region, in the order they were supplied. */
  tables: readonly ExtractedTable[];
  /** Per-region classification, so the picker can show its reasoning. */
  classifications: Readonly<Record<string, RegionClassification>>;
  /**
   * The shape each region was actually read as, keyed by region id.
   *
   * Sent back so the main thread can write it into the region rather than
   * working it out again. The rule for choosing between the user's shape and
   * the classifier's belongs in one place, and this is the place that applied
   * it; a second copy on the main thread is how the dropdown ends up showing
   * a shape that is not the one the rows came from.
   */
  resolvedShapes: Readonly<Record<string, PdfRegionShape>>;
  combined: CombinedTable;
};

export type PdfSniffProgress = {
  type: "progress";
  pagesScanned: number;
  totalPages: number;
};

export type PdfSniffError = {
  type: "error";
  /**
   * Machine-readable so the UI can render a specific explanation rather than
   * a generic failure. Every one of these is a different conversation with
   * the user.
   */
  reason:
    | "no_text_layer"
    | "unreliable_text"
    | "password_required"
    | "too_many_pages"
    | "unknown";
  message: string;
  detail?: Record<string, unknown>;
};

type SniffResponse =
  | PdfSniffResult
  | PdfExtractResult
  | PdfSniffProgress
  | PdfSniffError;

function _post(message: SniffResponse): void {
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(message);
}

function _close(): void {
  (self as unknown as DedicatedWorkerGlobalScope).close();
}

/**
 * Whether an inbound message is a request of ours.
 *
 * The port is shared. `loadPdfDocument` imports `pdf.worker.mjs`, which
 * installs pdf.js's own handler on this same global scope and puts its internal
 * protocol traffic (`{ sourceName: "worker", ... }`) through this listener
 * too. Those messages are not requests and must be ignored silently rather
 * than interpreted; treating one as an `extract` would be far worse than the
 * no-op it looks like, because extraction has no `file` to fail on and would
 * post a nonsense result. The main-thread driver ignores pdf.js's replies the
 * same way, in `_isPdfSniffResponse`.
 */
function _isPdfWorkerRequest(data: unknown): data is PdfWorkerRequest {
  if (typeof data !== "object" || data === null || !("type" in data)) {
    return false;
  }
  const { type } = data as { type: unknown };
  return type === "sniff" || type === "extract";
}

self.addEventListener("message", async (event: MessageEvent<unknown>) => {
  const request = event.data;
  if (!_isPdfWorkerRequest(request)) {
    return;
  }

  if (request.type === "extract") {
    const pagesByIndex = new Map(
      request.pages.map((page) => {
        return [page.pageIndex, page];
      }),
    );
    const tables: ExtractedTable[] = [];
    const classifications: Record<string, RegionClassification> = {};
    const resolvedShapes: Record<string, PdfRegionShape> = {};

    for (const region of request.regions) {
      // A region spanning pages is clipped per fragment and concatenated, so
      // a table continuing across a page break arrives as one table.
      const clipped = region.fragments.flatMap((fragment) => {
        const page = pagesByIndex.get(fragment.page);
        return page ? [clipToRegion({ page: page, bbox: fragment.bbox })] : [];
      });
      const firstClip = clipped[0];
      if (!firstClip) {
        continue;
      }
      const merged: RegionGeometry = {
        pageIndex: firstClip.pageIndex,
        bbox: firstClip.bbox,
        textItems: clipped.flatMap((clip) => {
          return clip.textItems;
        }),
        rules: clipped.flatMap((clip) => {
          return clip.rules;
        }),
        marks: clipped.flatMap((clip) => {
          return clip.marks;
        }),
      };

      const classification = classifyRegion(merged);
      classifications[region.id] = classification;

      // The user's own choice always wins; anything else is ours to revise.
      // A region carries a shape from the moment it is drawn, so testing
      // `region.shape` alone can never let the classifier through: that is
      // what made the drawn region's placeholder outlive every extraction.
      const shape =
        region.isShapeUserChosen === true ? region.shape : classification.shape;
      resolvedShapes[region.id] = shape;

      // `regionId` is written last so a stored option cannot rename the
      // region the extracted table claims to come from.
      const options = { ...region.options, regionId: region.id };

      tables.push(
        match(shape)
          .with("grid_table", () => {
            return extractGridTable(merged, options);
          })
          .with("labelled_graphic", () => {
            return extractLabelledGraphic(merged, options);
          })
          .with("repeating_blocks", () => {
            return extractRepeatingBlocks(merged, options);
          })
          .with("prose_measures", () => {
            return extractProseMeasures(merged, options);
          })
          .exhaustive(),
      );
    }

    const regionLabels = Object.fromEntries(
      request.regions.map((region) => {
        return [region.id, region.label];
      }),
    );

    _post({
      type: "extract_result",
      tables,
      classifications,
      resolvedShapes,
      combined: combineRegions({
        tables,
        regionLabels,
        documentMetadata: request.documentMetadata,
        outputMode: request.outputMode,
      }),
    });
    _close();
    return;
  }

  try {
    const bytes = new Uint8Array(await request.file.arrayBuffer());
    const doc = await loadPdfDocument(bytes, { password: request.password });

    const [rangeStart, rangeEnd] = request.pageRange ?? [1, doc.numPages];
    const firstPage = Math.max(1, rangeStart);
    const lastPage = Math.min(doc.numPages, rangeEnd);
    const pageCountToScan = lastPage - firstPage + 1;

    if (!request.pageRange && pageCountToScan > MAX_PAGES_WITHOUT_RANGE) {
      _post({
        type: "error",
        reason: "too_many_pages",
        message: `This PDF has ${doc.numPages} pages. Choose a page range so we only read the part you need.`,
        detail: { pageCount: doc.numPages },
      });
      _close();
      return;
    }

    const pages: PageGeometry[] = [];

    // Pages are read sequentially on purpose, so the await-in-loop here is
    // deliberate rather than an oversight. Two reasons: progress has to be
    // reported page by page, which a Promise.all cannot do; and a large
    // document read in parallel holds every page's geometry and pdf.js's
    // internal page objects in memory at once, which is exactly the case the
    // page-range cap exists to avoid.
    for (let pageNumber = firstPage; pageNumber <= lastPage; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      pages.push(
        await extractPageGeometry({ page: page, pageIndex: pageNumber - 1 }),
      );

      _post({
        type: "progress",
        pagesScanned: pageNumber - firstPage + 1,
        totalPages: pageCountToScan,
      });
    }

    // The text-layer check runs on collected geometry rather than per page,
    // because a document is only unusable when EVERY page is a scan.
    const textLayer = detectTextLayer(pages);
    if (textLayer.status === "no_text_layer") {
      _post({
        type: "error",
        reason: "no_text_layer",
        message:
          "This PDF has no text layer. It looks like a scan or photo of a document, and we can only extract data from PDFs that contain real text. Try re-exporting from the original source, or run OCR first. OCR support is planned.",
        detail: {
          scannedPageCount: textLayer.scannedPageCount,
          totalPageCount: textLayer.totalPageCount,
        },
      });
      _close();
      return;
    }
    if (textLayer.status === "unreliable_text") {
      _post({
        type: "error",
        reason: "unreliable_text",
        message:
          "This PDF's text cannot be read reliably. Its embedded fonts do not map cleanly to characters, so extracted values would be garbled. Try re-exporting it from the original source.",
        detail: { unmappedCharRatio: textLayer.unmappedCharRatio },
      });
      _close();
      return;
    }

    // `pages[0]` is the first page actually read, which is the cover only
    // when the user did not narrow the range. Reading the range's first
    // page is still the right guess: it is the page whose typography the
    // user is looking at.
    const { info } = await doc.getMetadata();
    const firstReadPage = pages[0];
    const documentMetadata =
      firstReadPage ?
        extractDocumentMetadata({
          page: firstReadPage,
          info: (info ?? {}) as Record<string, unknown>,
        })
      : {
          title: null,
          organisation: null,
          reportNumber: null,
          publishedAt: null,
        };

    _post({ type: "result", pageCount: doc.numPages, pages, documentMetadata });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    const isPasswordError = /password/i.test(message);
    _post({
      type: "error",
      reason: isPasswordError ? "password_required" : "unknown",
      message:
        isPasswordError ?
          "This PDF is password protected. Enter its password to continue."
        : message,
    });
  } finally {
    _close();
  }
});
