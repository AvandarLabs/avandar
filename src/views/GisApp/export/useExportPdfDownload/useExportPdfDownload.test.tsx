import { beforeEach, describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { act, renderHook, TestProviders } from "@/test-utils";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { UseExportPdfDownloadInput } from "@/views/GisApp/export/useExportPdfDownload/useExportPdfDownload";

const {
  captureExportMapCanvasMock,
  composeExportPdfMock,
  fetchMapLayerFeatureListMock,
  workspaceMetadata,
} = vi.hoisted(() => {
  return {
    captureExportMapCanvasMock: vi.fn(),
    composeExportPdfMock: vi.fn(),
    fetchMapLayerFeatureListMock: vi.fn(),
    /** What the mocked dataset clients return; undefined while loading. */
    workspaceMetadata: {
      datasets: [] as unknown[] | undefined,
      datasetColumns: [] as unknown[] | undefined,
    },
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

vi.mock("@/clients/maps/MapLayerFeatureList/fetchMapLayerFeatureList", () => {
  return { fetchMapLayerFeatureList: fetchMapLayerFeatureListMock };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [workspaceMetadata.datasets, false, {}];
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [workspaceMetadata.datasetColumns, false, {}];
      },
    },
  };
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
    workspaceId: uuid<Workspace.Id>(),
    basemapAttribution: "MapLibre, OpenStreetMap contributors",
    legendEntries: [],
    hasDrawnDisputedFeature: false,
  };
}

/** A hook input whose export lists an exact "Sites" point layer. */
function _inputWithFeatureList(): UseExportPdfDownloadInput {
  const base = _input();
  const layer: MapLayer.T = {
    ...MapLayer.makeEmpty("Sites"),
    geoBinding: {
      type: "latLngColumns",
      latitude: uuid<QueryColumn.Id>(),
      longitude: uuid<QueryColumn.Id>(),
    },
  };
  return {
    ...base,
    config: {
      ...base.config,
      layers: [layer],
      exportLayout: {
        ...base.config.exportLayout,
        featureList: {
          layerId: layer.id,
          columnIds: [],
          sort: undefined,
          maxRows: 200,
        },
      },
    },
  };
}

describe("useExportPdfDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMapLayerFeatureListMock.mockReset();
    workspaceMetadata.datasets = [];
    workspaceMetadata.datasetColumns = [];
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
  it("hands the composer the feature list fetched at download", async () => {
    fetchMapLayerFeatureListMock.mockResolvedValue({
      columns: [{ key: "site_id", label: "site_id", kind: "source" }],
      rows: [{ site_id: "S1" }, { site_id: "S2" }],
      totalCount: 2,
      distanceUnit: undefined,
    });
    const input = _inputWithFeatureList();
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(input);
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(fetchMapLayerFeatureListMock).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: input.workspaceId,
        datasets: [],
        datasetColumns: [],
      }),
    );
    expect(composeExportPdfMock.mock.calls[0]![0].featureTable).toEqual({
      summaryLine: "2 Sites",
      truncationNote: undefined,
      buildColumnLimitNote: expect.any(Function),
      headerLabels: ["site_id"],
      rows: [["S1"], ["S2"]],
    });
  });

  it("passes no table and fetches nothing when the layout has no list", async () => {
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_input());
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(fetchMapLayerFeatureListMock).not.toHaveBeenCalled();
    expect(composeExportPdfMock.mock.calls[0]![0].featureTable).toBeUndefined();
  });

  it("writes no file when the feature list cannot be fetched", async () => {
    fetchMapLayerFeatureListMock.mockRejectedValue(new Error("query failed"));
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_inputWithFeatureList());
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(result.current.status).toBe("error");
    expect(composeExportPdfMock).not.toHaveBeenCalled();
  });

  it("asks for a retry, and prints no list, while the datasets are loading", async () => {
    workspaceMetadata.datasetColumns = undefined;
    const { result } = renderHook(
      () => {
        return useExportPdfDownload(_inputWithFeatureList());
      },
      { wrapper: TestProviders },
    );

    await act(async () => {
      await result.current.download();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.errorMessage).toContain("Try again in a moment");
    expect(fetchMapLayerFeatureListMock).not.toHaveBeenCalled();
    expect(composeExportPdfMock).not.toHaveBeenCalled();
  });
});
