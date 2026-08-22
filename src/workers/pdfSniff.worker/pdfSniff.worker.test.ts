import type {
  PageGeometry,
  PdfRegion,
  TextItem,
} from "../pdfSniff/pdfSniff.types";
import type { PdfExtractResult } from "./pdfSniff.worker";

import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * The worker's extract path, driven the way the main thread drives it.
 *
 * Under jsdom `self` is the window, so the module's `addEventListener`,
 * `postMessage` and `close` all land on it. That is enough to exercise the one
 * decision this file makes that nothing else can: which shape a region is
 * actually read as.
 */
const postMessage = vi.fn();
vi.stubGlobal("postMessage", postMessage);
vi.stubGlobal("close", vi.fn());

await import("./pdfSniff.worker");

function item(text: string, x: number, y: number): TextItem {
  return {
    text,
    x,
    y,
    width: text.length * 5,
    height: 9,
    fontName: "body",
    unmappedCharRatio: 0,
  };
}

/** A map-like page: short labels and figures, scattered, with no columns. */
const GRAPHIC_PAGE: PageGeometry = {
  pageIndex: 0,
  width: 600,
  height: 700,
  textItems: [
    item("KHARTOUM", 480, 302),
    item("408", 490, 292),
    item("KASSALA", 560, 402),
    item("200", 566, 392),
    item("SENNAR", 300, 500),
    item("202", 306, 490),
  ],
  rules: [],
  marks: [],
  marksTruncated: false,
  looksScanned: false,
};

/** A ruled table: two rows whose items line up in two columns. */
const TABLE_PAGE: PageGeometry = {
  pageIndex: 0,
  width: 600,
  height: 700,
  textItems: [
    item("District", 100, 600),
    item("Cases", 250, 600),
    item("Gao", 100, 580),
    item("1204", 250, 580),
  ],
  rules: [
    { orientation: "horizontal", position: 590, span: [90, 400] },
    { orientation: "horizontal", position: 570, span: [90, 400] },
  ],
  marks: [],
  marksTruncated: false,
  looksScanned: false,
};

const WHOLE_PAGE: PdfRegion["fragments"] = [
  { page: 0, bbox: [0, 0, 600, 700] },
];

function region(overrides: Partial<PdfRegion> = {}): PdfRegion {
  return {
    id: "r1",
    label: "Region 1",
    // What `PdfRegionPicker` gives a freshly drawn box.
    shape: "prose_measures",
    detectionMode: "manual",
    fragments: WHOLE_PAGE,
    options: {},
    ...overrides,
  };
}

async function extract(options: {
  page: PageGeometry;
  region: PdfRegion;
}): Promise<PdfExtractResult> {
  self.dispatchEvent(
    new MessageEvent("message", {
      data: {
        type: "extract",
        pages: [options.page],
        regions: [options.region],
        documentMetadata: {
          title: null,
          organisation: null,
          reportNumber: null,
          publishedAt: null,
        },
      },
    }),
  );
  await vi.waitFor(() => {
    expect(postMessage).toHaveBeenCalled();
  });
  return postMessage.mock.calls[0]![0] as PdfExtractResult;
}

describe("pdfSniff worker: which shape a region is read as", () => {
  beforeEach(() => {
    postMessage.mockClear();
  });

  it("reads a region as the shape the classifier chose, not its default", async () => {
    // The regression this exists for: a drawn region arrives carrying a
    // placeholder shape, and a placeholder is truthy, so the classifier's
    // verdict never reached the extractor and a map was read as prose. The
    // rows are asserted as well as the shape, because that failure was silent:
    // `extractProseMeasures` returns an empty table rather than an error.
    const result = await extract({
      page: GRAPHIC_PAGE,
      region: region({ shape: "prose_measures" }),
    });

    expect(result.classifications["r1"]?.shape).toBe("labelled_graphic");
    expect(result.resolvedShapes["r1"]).toBe("labelled_graphic");
    expect(result.tables[0]?.cells[0]).toEqual(["label", "value"]);
    expect(result.tables[0]?.cells.length).toBeGreaterThan(1);
  });

  it("keeps the user's shape when they have chosen one", async () => {
    // The map read as a table on purpose. The user's choice is wrong for this
    // region and it still has to win, or the override is not an override.
    const result = await extract({
      page: GRAPHIC_PAGE,
      region: region({ shape: "grid_table", isShapeUserChosen: true }),
    });

    expect(result.classifications["r1"]?.shape).toBe("labelled_graphic");
    expect(result.resolvedShapes["r1"]).toBe("grid_table");
  });

  it("re-classifies a region whose stored shape the user never chose", async () => {
    // A shape written back by a previous extraction is ours, not theirs, so
    // moving the box to different content re-decides it.
    const result = await extract({
      page: TABLE_PAGE,
      region: region({ shape: "labelled_graphic" }),
    });

    expect(result.resolvedShapes["r1"]).toBe("grid_table");
    expect(result.tables[0]?.cells).toEqual([
      ["District", "Cases"],
      ["Gao", "1204"],
    ]);
  });
});
