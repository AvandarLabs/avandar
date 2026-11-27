import { afterEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { act, fireEvent, render, screen } from "@/test-utils";
import { AnnotateHarness } from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/AnnotateHarness";
import {
  createFakeMap,
  emitWindowPointer,
  openAnnotateSubCluster,
} from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/annotateMapToolHarness";
import {
  makeFreehandAnnotationFeature,
  makeTextAnnotationFeature,
} from "@/views/GisApp/tools/makeAnnotationFeatureHelpers";
import {} from "../AnnotateMapToolTestHelpers";

describe("AnnotateMapTool", () => {
  afterEach(() => {
    document.querySelectorAll("canvas").forEach((canvas) => {
      canvas.remove();
    });
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
      config.annotations.features.every((feature) => {
        return feature.kind === "freehand";
      }),
    ).toBe(true);
    expect(
      config.annotations.features.map((feature) => {
        return feature.id;
      }),
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

/* Register fixture mocks before Vitest loads the component dependencies. */
await vi.hoisted(async () => {
  await import("../AnnotateMapToolTestHelpers");
});
