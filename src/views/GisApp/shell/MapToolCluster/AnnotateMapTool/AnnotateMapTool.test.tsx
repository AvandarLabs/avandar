/**
 * Annotate sub-cluster: four drawing tools, persist, and the pinned row.
 */
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/test-utils";
import { AnnotateHarness } from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/AnnotateHarness";
import {
  createFakeMap,
  emitTargetPointer,
  emitWindowPointer,
  openAnnotateSubCluster,
} from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/annotateMapToolHarness";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";
import {
  makeFreehandAnnotationFeature,
  makeTextAnnotationFeature,
} from "@/views/GisApp/tools/makeAnnotationFeatureHelpers";

const spatialAvailability = vi.hoisted(() => {
  return {
    value: "unavailable" as "loading" | "available" | "unavailable",
  };
});

vi.mock("@/clients/DuckDbClient/DuckDbClient", () => {
  return {
    DuckDbClient: {
      getSpatialAvailability: () => {
        return spatialAvailability.value;
      },
      subscribeSpatialAvailability: () => {
        return () => {
          return undefined;
        };
      },
    },
  };
});

describe("AnnotateMapTool", () => {
  afterEach(() => {
    document.querySelectorAll("canvas").forEach((canvas) => {
      canvas.remove();
    });
  });
  it("expands a sub-cluster of text, arrow, freehand, and area", async () => {
    render(
      <MapToolCluster
        mapToolMode={{ type: "pan" }}
        onMapToolModeChange={vi.fn()}
      />,
    );

    await openAnnotateSubCluster();

    expect(screen.getByRole("button", { name: "Place text" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Draw an arrow" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Draw freehand" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Draw an annotation area" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", {
        name: "Isochrone from a point. This tool arrives in a later release.",
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Erase annotations" }),
    ).toBeVisible();
  });

  it("places placeholder text, focuses the overlay, and returns to Select", async () => {
    const fakeMap = createFakeMap();
    let config = AvaMapConfig.makeEmpty();
    render(
      <AnnotateHarness
        fakeMap={fakeMap}
        onConfigChange={(nextConfig) => {
          config = nextConfig;
        }}
      />,
    );

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Place text" }));
    act(() => {
      fakeMap.emitClick(29.2, -1.7);
    });

    const overlay = screen.getByTestId("annotation-text-overlay");
    expect(overlay).toHaveValue("Enter your text here");
    expect(overlay).toHaveFocus();
    expect(
      screen.getByRole("button", { name: "Pan and select" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(config.annotations.features).toEqual([
      expect.objectContaining({
        kind: "text",
        text: "Enter your text here",
      }),
    ]);
  });

  it("focuses the overlay after placing a second text feature", async () => {
    const fakeMap = createFakeMap();
    render(<AnnotateHarness fakeMap={fakeMap} />);

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Place text" }));
    act(() => {
      fakeMap.emitClick(29.2, -1.7);
    });
    const firstOverlay = screen.getByTestId("annotation-text-overlay");
    expect(firstOverlay).toHaveFocus();
    act(() => {
      firstOverlay.blur();
    });

    fireEvent.click(screen.getByRole("button", { name: "Place text" }));
    act(() => {
      fakeMap.emitClick(30.2, -2.7);
    });

    const secondOverlay = screen.getByTestId("annotation-text-overlay");
    expect(secondOverlay).toHaveValue("Enter your text here");
    expect(secondOverlay).toHaveFocus();
  });

  it("moves selected text in Select after the overlay commits", async () => {
    const fakeMap = createFakeMap();
    let config = AvaMapConfig.makeEmpty();
    render(
      <AnnotateHarness
        fakeMap={fakeMap}
        onConfigChange={(nextConfig) => {
          config = nextConfig;
        }}
      />,
    );

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Place text" }));
    act(() => {
      fakeMap.emitClick(29.2, -1.7);
    });
    act(() => {
      screen.getByTestId("annotation-text-overlay").blur();
    });

    const frame = screen.getByTestId("annotation-text-selection");
    act(() => {
      emitTargetPointer(frame, "pointerdown", 29.2, -1.7);
      emitWindowPointer("pointermove", 40, 10);
      emitWindowPointer("pointerup", 40, 10);
    });

    expect(config.annotations.features[0]).toEqual(
      expect.objectContaining({
        kind: "text",
        geometry: { type: "Point", coordinates: [40, 10] },
      }),
    );
  });

  it("shows an Annotations row after the first feature is added", async () => {
    const fakeMap = createFakeMap();
    render(<AnnotateHarness fakeMap={fakeMap} />);

    expect(
      screen.queryByRole("button", { name: "Annotations" }),
    ).not.toBeInTheDocument();

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Place text" }));
    act(() => {
      fakeMap.emitClick(10, 10);
    });

    expect(screen.getByRole("button", { name: "Annotations" })).toBeVisible();
  });

  it("keeps in-progress annotation area off AOI chrome", async () => {
    const fakeMap = createFakeMap();
    render(<AnnotateHarness fakeMap={fakeMap} />);

    await openAnnotateSubCluster();
    fireEvent.click(
      screen.getByRole("button", { name: "Draw an annotation area" }),
    );
    act(() => {
      fakeMap.emitDblClick(0, 0);
      fakeMap.emitClick(1, 0);
      fakeMap.emitClick(1, 1);
    });

    expect(screen.getByTestId("aoi-in-progress")).toHaveTextContent("[]");
    expect(screen.getByTestId("annotation-preview")).toHaveTextContent(
      "[[0,0],[1,0],[1,1]]",
    );
  });

  it("discards a freehand stroke with one vertex", async () => {
    const fakeMap = createFakeMap();
    render(<AnnotateHarness fakeMap={fakeMap} />);

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Draw freehand" }));
    fakeMap.dragPan.enable.mockClear();
    act(() => {
      fakeMap.emitPointerDown(0, 0);
      emitWindowPointer("pointerup");
    });

    expect(
      screen.queryByRole("button", { name: "Annotations" }),
    ).not.toBeInTheDocument();
    expect(fakeMap.dragPan.enable).not.toHaveBeenCalled();
  });

  it("shows a live annotation stroke while the freehand pointer is down", async () => {
    const fakeMap = createFakeMap();
    render(<AnnotateHarness fakeMap={fakeMap} />);

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Draw freehand" }));
    act(() => {
      fakeMap.emitPointerDown(0, 0);
      emitWindowPointer("pointermove", 2, 3);
    });

    expect(screen.getByTestId("aoi-in-progress")).toHaveTextContent("[]");
    expect(screen.getByTestId("annotation-preview")).toHaveTextContent(
      "[[0,0],[2,3]]",
    );
    expect(
      screen.queryByRole("button", { name: "Annotations" }),
    ).not.toBeInTheDocument();
  });

  it("commits a freehand stroke on window pointerup", async () => {
    const fakeMap = createFakeMap();
    render(<AnnotateHarness fakeMap={fakeMap} />);

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Draw freehand" }));
    fakeMap.dragPan.enable.mockClear();
    act(() => {
      fakeMap.emitPointerDown(0, 0);
      emitWindowPointer("pointermove", 1, 1);
      emitWindowPointer("pointerup", 1, 1);
    });

    expect(screen.getByRole("button", { name: "Annotations" })).toBeVisible();
    expect(fakeMap.dragPan.enable).not.toHaveBeenCalled();
  });

  it("cancels an in-progress freehand stroke on pointercancel", async () => {
    const fakeMap = createFakeMap();
    render(<AnnotateHarness fakeMap={fakeMap} />);

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Draw freehand" }));
    fakeMap.dragPan.enable.mockClear();
    act(() => {
      fakeMap.emitPointerDown(4, 4);
      emitWindowPointer("pointermove", 5, 5);
      emitWindowPointer("pointercancel", 5, 5);
    });

    expect(
      screen.queryByRole("button", { name: "Annotations" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("annotation-preview")).toHaveTextContent("[]");
    expect(fakeMap.dragPan.enable).not.toHaveBeenCalled();
  });

  it("shows a live arrow preview while the pointer is down", async () => {
    const fakeMap = createFakeMap();
    render(<AnnotateHarness fakeMap={fakeMap} />);

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Draw an arrow" }));
    act(() => {
      fakeMap.emitPointerDown(0, 0);
      emitWindowPointer("pointermove", 10, 10);
    });

    expect(screen.getByTestId("annotation-preview")).toHaveTextContent(
      "[[0,0],[10,10]]",
    );
    expect(
      screen.queryByRole("button", { name: "Annotations" }),
    ).not.toBeInTheDocument();
  });

  it("commits an arrow from a press-drag-release with default paint", async () => {
    const fakeMap = createFakeMap();
    let config = AvaMapConfig.makeEmpty();
    render(
      <AnnotateHarness
        fakeMap={fakeMap}
        onConfigChange={(nextConfig) => {
          config = nextConfig;
        }}
      />,
    );

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Draw an arrow" }));
    act(() => {
      fakeMap.emitPointerDown(0, 0);
      emitWindowPointer("pointermove", 10, 10);
      emitWindowPointer("pointerup", 10, 10);
    });

    expect(config.annotations.features).toEqual([
      expect.objectContaining({
        kind: "arrow",
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [10, 10],
          ],
        },
        color: "#3b82f6",
        strokeWidthPx: 2,
      }),
    ]);
  });

  it("does not commit an arrow from two clicks without a drag", async () => {
    const fakeMap = createFakeMap();
    let config = AvaMapConfig.makeEmpty();
    render(
      <AnnotateHarness
        fakeMap={fakeMap}
        onConfigChange={(nextConfig) => {
          config = nextConfig;
        }}
      />,
    );

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Draw an arrow" }));
    act(() => {
      fakeMap.emitClick(0, 0);
      fakeMap.emitClick(10, 10);
    });

    expect(config.annotations.features).toEqual([]);
  });

  it("writes an annotation area without setting aoi", async () => {
    const fakeMap = createFakeMap();
    let config = AvaMapConfig.makeEmpty();
    render(
      <AnnotateHarness
        fakeMap={fakeMap}
        onConfigChange={(nextConfig) => {
          config = nextConfig;
        }}
      />,
    );

    await openAnnotateSubCluster();
    fireEvent.click(
      screen.getByRole("button", { name: "Draw an annotation area" }),
    );
    act(() => {
      fakeMap.emitPointerDown(0, 0);
      emitWindowPointer("pointermove", 10, 10);
      emitWindowPointer("pointerup", 10, 10);
    });

    expect(config.aoi).toBeUndefined();
    expect(config.annotations.features).toEqual([
      expect.objectContaining({
        kind: "area",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [10, 0],
              [10, 10],
              [0, 10],
              [0, 0],
            ],
          ],
        },
        color: "#3b82f6",
        opacity: 0.35,
      }),
    ]);
  });

  it("deletes a text annotation when the eraser hits it", () => {
    const feature = makeTextAnnotationFeature([10, 10], "Hello");
    const fakeMap = createFakeMap();
    let config = AvaMapConfig.withAnnotationFeature({
      config: AvaMapConfig.makeEmpty(),
      feature,
    });
    render(
      <AnnotateHarness
        fakeMap={fakeMap}
        initialConfig={config}
        onConfigChange={(nextConfig) => {
          config = nextConfig;
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Erase annotations" }));
    act(() => {
      fakeMap.emitPointerDown(10, 10);
      emitWindowPointer("pointermove", 10, 10);
      emitWindowPointer("pointerup", 10, 10);
    });

    expect(config.annotations.features).toEqual([]);
  });

  it("splits a freehand stroke where the eraser crosses it", () => {
    const stroke = makeFreehandAnnotationFeature([
      [0, 0],
      [40, 0],
      [80, 0],
    ]);
    const fakeMap = createFakeMap();
    let config = AvaMapConfig.withAnnotationFeature({
      config: AvaMapConfig.makeEmpty(),
      feature: stroke,
    });
    render(
      <AnnotateHarness
        fakeMap={fakeMap}
        initialConfig={config}
        onConfigChange={(nextConfig) => {
          config = nextConfig;
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Erase annotations" }));
    act(() => {
      fakeMap.emitPointerDown(40, 0);
      emitWindowPointer("pointerup", 40, 0);
    });

    expect(config.annotations.features).toHaveLength(2);
    expect(
      config.annotations.features.every(
        (feature) => {return feature.kind === "freehand"},
      ),
    ).toBe(true);
    expect(
      config.annotations.features.map((feature) => {return feature.id}),
    ).not.toContain(stroke.id);
  });

  it("does not erase while Alt is held", () => {
    const feature = makeTextAnnotationFeature([10, 10], "Hello");
    const fakeMap = createFakeMap();
    let config = AvaMapConfig.withAnnotationFeature({
      config: AvaMapConfig.makeEmpty(),
      feature,
    });
    render(
      <AnnotateHarness
        fakeMap={fakeMap}
        initialConfig={config}
        onConfigChange={(nextConfig) => {
          config = nextConfig;
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Erase annotations" }));
    act(() => {
      fakeMap.emitPointerDown(10, 10, { altKey: true });
      emitWindowPointer("pointermove", 10, 10, { altKey: true });
      emitWindowPointer("pointerup", 10, 10, { altKey: true });
    });

    expect(config.annotations.features).toEqual([feature]);
  });
});
