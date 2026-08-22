import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExportPdfInput } from "@/views/GisApp/export/composeExportPdf/composeExportPdf";
import type { ExportLegendEntry } from "@/views/GisApp/export/composeExportPdf/drawExportLegend/drawExportLegend";

const { fakeDocument, jsPDFMock } = vi.hoisted(() => {
  const document = {
    setProperties: vi.fn(),
    setFillColor: vi.fn(),
    setTextColor: vi.fn(),
    setDrawColor: vi.fn(),
    setFontSize: vi.fn(),
    setLineDashPattern: vi.fn(),
    rect: vi.fn(),
    line: vi.fn(),
    circle: vi.fn(),
    text: vi.fn(),
    addImage: vi.fn(),
    addPage: vi.fn(),
    getNumberOfPages: vi.fn(() => {
      return document.addPage.mock.calls.length + 1;
    }),
    save: vi.fn(),
  };
  return {
    fakeDocument: document,
    jsPDFMock: vi.fn(() => {
      return document;
    }),
  };
});

vi.mock("jspdf", () => {
  return { default: jsPDFMock };
});

// Imported after the mock so the module under test picks up the fake ctor.
const { composeExportPdf } =
  await import("@/views/GisApp/export/composeExportPdf/composeExportPdf");

const PAGE = {
  pageMm: { width: 297, height: 210 },
  mapFrameMm: { x: 12, y: 30, width: 229, height: 152 },
  legendMm: { x: 241, y: 30, width: 56, height: 152 },
  headerMm: { x: 12, y: 12, width: 273, height: 18 },
  footerMm: { x: 12, y: 182, width: 273, height: 16 },
  mapCanvasPx: { width: 1803, height: 1197 },
};

/** Builds `count` distinct legend entries for fitting-capacity scenarios. */
function _makeLegendEntries(count: number): ExportLegendEntry[] {
  return Array.from({ length: count }, (_, index) => {
    return {
      label: `Layer ${index}`,
      swatch: { type: "fill", color: "#336699" },
    };
  });
}

/** Builds a complete `ExportPdfInput`, overridden per test scenario. */
function _options(
  overrides: Readonly<{
    legendEntryCount?: number;
    title?: string;
    producedAt?: Date;
    workspaceName?: string;
    hasAoi?: boolean;
    timeWindow?: string | undefined;
    hasDrawnDisputedFeature?: boolean;
  }>,
): ExportPdfInput {
  const producedAt = overrides.producedAt ?? new Date("2026-08-18T09:00:00Z");
  const hasAoi = overrides.hasAoi ?? false;
  const timeWindow =
    "timeWindow" in overrides ? overrides.timeWindow : undefined;
  const filterReadoutLines = [
    ...(timeWindow !== undefined ? [`Dates: ${timeWindow}`] : []),
    ...(hasAoi ? ["Area of interest applied"] : []),
  ];

  return {
    canvas: Object.assign(document.createElement("canvas"), {
      toDataURL: () => {
        return "data:image/png;base64,";
      },
    }),
    page: PAGE,
    layout: {
      paper: "a4",
      orientation: "landscape",
      title: { isVisible: true, text: "" },
      subtitle: { isVisible: true, text: "" },
      northArrow: true,
      scaleBar: true,
      sourceLine: "",
      disclaimer: undefined,
    },
    text: {
      title: overrides.title ?? "Cholera response",
      subtitle: "Case density",
      sourceLine: "Health cluster, OpenStreetMap contributors",
    },
    workspaceName: overrides.workspaceName ?? "Avandar",
    disclaimer: "Boundaries are not authoritative.",
    filterReadoutLines,
    legendEntries: _makeLegendEntries(overrides.legendEntryCount ?? 3),
    hasDrawnDisputedFeature: overrides.hasDrawnDisputedFeature ?? false,
    disputedLegendLabel: "Disputed or undetermined boundary",
    scaleLabel: "0    50    100 km",
    producedAtLabel: `Produced ${producedAt.toISOString().slice(0, 10)}`,
    filename: `${(overrides.title ?? "Cholera response")
      .toLowerCase()
      .replace(/\s+/g, "-")}-${producedAt.toISOString().slice(0, 10)}.pdf`,
    pageNumberLabel: ({ page, total }) => {
      return `Page ${page} of ${total}`;
    },
  };
}

/** All strings passed to `document.text`, in call order. */
function _writtenText(): string[] {
  return fakeDocument.text.mock.calls.map((call) => {
    return call[0] as string;
  });
}

/** The millimetre rectangle `addImage` used to place the map canvas. */
async function _capturedMapFrame(
  overrides: Parameters<typeof _options>[0],
): Promise<Readonly<{ x: number; y: number; width: number; height: number }>> {
  fakeDocument.addImage.mockClear();
  await composeExportPdf(_options(overrides));
  const [, , x, y, width, height] = fakeDocument.addImage.mock.calls[0]!;
  return { x, y, width, height };
}

describe("composeExportPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("writes one page when the legend fits", async () => {
    await composeExportPdf(_options({ legendEntryCount: 3 }));

    expect(fakeDocument.addPage).not.toHaveBeenCalled();
  });

  it("moves the legend to page 2 when it cannot fit", async () => {
    await composeExportPdf(_options({ legendEntryCount: 60 }));

    expect(fakeDocument.addPage).toHaveBeenCalledTimes(1);
  });

  it("never shrinks the map frame to fit a legend", async () => {
    const small = await _capturedMapFrame({ legendEntryCount: 3 });
    const large = await _capturedMapFrame({ legendEntryCount: 60 });

    expect(large).toEqual(small);
  });

  it("adds page numbers only when there is a second page", async () => {
    await composeExportPdf(_options({ legendEntryCount: 60 }));

    expect(_writtenText()).toContain("Page 1 of 2");
    expect(_writtenText()).toContain("Page 2 of 2");
  });

  it("omits page numbers when everything fits on one page", async () => {
    await composeExportPdf(_options({ legendEntryCount: 3 }));

    expect(
      _writtenText().some((line) => {
        return line.startsWith("Page ");
      }),
    ).toBe(false);
  });

  it("names the file from the rendered title and production date", async () => {
    await composeExportPdf(
      _options({
        title: "Cholera response",
        producedAt: new Date("2026-08-18T09:00:00Z"),
      }),
    );

    expect(fakeDocument.save).toHaveBeenCalledWith(
      "cholera-response-2026-08-18.pdf",
    );
  });

  it("prints the production date", async () => {
    await composeExportPdf(
      _options({ producedAt: new Date("2026-08-18T09:00:00Z") }),
    );

    expect(_writtenText().join(" ")).toContain("2026");
  });

  it("prints the workspace name", async () => {
    await composeExportPdf(_options({ workspaceName: "DRC Response" }));

    expect(_writtenText()).toContain("DRC Response");
  });

  it("prints the filter readout when a filter is set", async () => {
    await composeExportPdf(_options({ hasAoi: true }));

    expect(_writtenText()).toContain("Area of interest applied");
  });

  it("omits the filter readout when no filter is set", async () => {
    await composeExportPdf(_options({ hasAoi: false, timeWindow: undefined }));

    expect(_writtenText()).not.toContain("Area of interest applied");
  });

  it("prints the locked disputed row when a disputed segment is drawn", async () => {
    await composeExportPdf(_options({ hasDrawnDisputedFeature: true }));

    expect(_writtenText()).toContain("Disputed or undetermined boundary");
  });

  it("still prints the locked disputed row when the legend overflows to page 2", async () => {
    await composeExportPdf(
      _options({ hasDrawnDisputedFeature: true, legendEntryCount: 60 }),
    );

    expect(_writtenText()).toContain("Disputed or undetermined boundary");
  });

  it("does not save when even a full page cannot hold the legend", async () => {
    await expect(
      composeExportPdf(_options({ legendEntryCount: 5000 })),
    ).rejects.toThrow("The export legend does not fit on a page");
    expect(fakeDocument.save).not.toHaveBeenCalled();
  });

  it("uses light surfaces regardless of the app theme", async () => {
    await composeExportPdf(_options({}));

    expect(fakeDocument.setFillColor).toHaveBeenCalledWith("#ffffff");
  });

  it("does not save when placing the map image throws", async () => {
    fakeDocument.addImage.mockImplementation(() => {
      throw new Error("boom");
    });

    await expect(composeExportPdf(_options({}))).rejects.toThrow("boom");
    expect(fakeDocument.save).not.toHaveBeenCalled();
  });

  it("does not save when drawing header text throws", async () => {
    fakeDocument.text.mockImplementation(() => {
      throw new Error("header boom");
    });

    await expect(composeExportPdf(_options({}))).rejects.toThrow("header boom");
    expect(fakeDocument.save).not.toHaveBeenCalled();
  });
});
