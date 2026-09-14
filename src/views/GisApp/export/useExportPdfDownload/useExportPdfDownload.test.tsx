import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { act, renderHook, TestProviders } from "@/test-utils";
import type { UseExportPdfDownloadInput } from "@/views/GisApp/export/useExportPdfDownload/useExportPdfDownload";

const { captureExportMapCanvasMock, composeExportPdfMock } = vi.hoisted(() => {
  return {
    captureExportMapCanvasMock: vi.fn(),
    composeExportPdfMock: vi.fn(),
  };
});

vi.mock(
  "@/views/GisApp/export/captureExportMapCanvas/captureExportMapCanvas",
  () => {
    return { captureExportMapCanvas: captureExportMapCanvasMock };
  },
);

vi.mock("@/views/GisApp/export/composeExportPdf/composeExportPdf", () => {
  return { composeExportPdf: composeExportPdfMock };
});

const { useExportPdfDownload } =
  await import("@/views/GisApp/export/useExportPdfDownload/useExportPdfDownload");

/** A canvas good enough to hand to the (mocked) composer. */
function _fakeCanvas(): HTMLCanvasElement {
  return document.createElement("canvas");
}

/** Resolves capture with a usable canvas and lets compose succeed. */
function _succeedCapture(): void {
  captureExportMapCanvasMock.mockResolvedValue(_fakeCanvas());
  composeExportPdfMock.mockResolvedValue(undefined);
}

/** Leaves capture pending forever, so `status` can be observed as pending. */
function _deferCapture(): void {
  captureExportMapCanvasMock.mockReturnValue(new Promise(() => {}));
}

/** Rejects capture, as `captureExportMapCanvas` does on a blank canvas. */
function _failCapture(error: Error): void {
  captureExportMapCanvasMock.mockRejectedValue(error);
}

/** Rejects composition, as `composeExportPdf` does rather than write a file. */
function _failCompose(error: Error): void {
  captureExportMapCanvasMock.mockResolvedValue(_fakeCanvas());
  composeExportPdfMock.mockRejectedValue(error);
}

/** A minimal hook input, with a zoom and scale-bar toggle for scale tests. */
function _input(
  overrides: Readonly<{ zoom?: number; scaleBar?: boolean }> = {},
): UseExportPdfDownloadInput {
  const base = AvaMapConfig.makeEmpty();
  return {
    config: {
      ...base,
      exportLayout: {
        ...base.exportLayout,
        scaleBar: overrides.scaleBar ?? base.exportLayout.scaleBar,
      },
    },
    spec: { sources: {}, layers: [] },
    view: { center: [0, 0], zoom: overrides.zoom ?? 8 },
    mapName: "Cholera response",
    workspaceName: "Test workspace",
    basemapAttribution: "MapLibre, OpenStreetMap contributors",
    legendEntries: [],
    hasDrawnDisputedFeature: false,
  };
}

describe("useExportPdfDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    _succeedCapture();
  });

  it("starts idle with the download available", () => {
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_input());
      },
      {
        wrapper: TestProviders,
      },
    );

    expect(result.current.status).toBe("idle");
  });

  it("reports pending while the map is not idle", async () => {
    _deferCapture();
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_input());
      },
      {
        wrapper: TestProviders,
      },
    );

    act(() => {
      void result.current.download();
    });

    expect(result.current.status).toBe("pending");
  });

  it("reports an error and writes no file when capture fails", async () => {
    _failCapture(new Error("The export map rendered blank"));
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_input());
      },
      {
        wrapper: TestProviders,
      },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(result.current.status).toBe("error");
    expect(composeExportPdfMock).not.toHaveBeenCalled();
  });

  it("reports an error when composition throws", async () => {
    _failCompose(new Error("boom"));
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_input());
      },
      {
        wrapper: TestProviders,
      },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(result.current.status).toBe("error");
  });

  it("allows a retry after an error", async () => {
    _failCapture(new Error("blank"));
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_input());
      },
      {
        wrapper: TestProviders,
      },
    );
    await act(async () => {
      await result.current.download();
    });
    _succeedCapture();

    await act(async () => {
      await result.current.download();
    });

    expect(result.current.status).toBe("success");
  });

  it("stamps the production date at download, not at render", async () => {
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_input());
      },
      {
        wrapper: TestProviders,
      },
    );
    vi.setSystemTime(new Date("2026-08-19T00:00:00Z"));

    await act(async () => {
      await result.current.download();
    });

    expect(composeExportPdfMock.mock.calls[0]![0].filename).toContain(
      "2026-08-19",
    );
    vi.useRealTimers();
  });

  it("prints a scale bar above zoom 4", async () => {
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_input({ zoom: 8 }));
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(composeExportPdfMock.mock.calls[0]![0].scaleLabel).toMatch(/km|m$/);
  });

  it("replaces the bar with a caveat below zoom 4", async () => {
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_input({ zoom: 3 }));
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(composeExportPdfMock.mock.calls[0]![0].scaleLabel).toBe(
      "Scale varies across this map",
    );
  });

  it("passes no scale when the author turned the bar off", async () => {
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_input({ scaleBar: false }));
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(composeExportPdfMock.mock.calls[0]![0].scaleLabel).toBeUndefined();
  });
});
