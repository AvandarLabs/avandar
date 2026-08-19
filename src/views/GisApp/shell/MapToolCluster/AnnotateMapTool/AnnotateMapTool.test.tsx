/**
 * Annotate sub-cluster: four drawing tools, persist, and the pinned row.
 */
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/test-utils";
import { AnnotateHarness } from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/AnnotateHarness";
import {
  createFakeMap,
  emitWindowPointer,
  openAnnotateSubCluster,
} from "@/views/GisApp/shell/MapToolCluster/AnnotateMapTool/annotateMapToolHarness";
import { MapToolCluster } from "@/views/GisApp/shell/MapToolCluster/MapToolCluster";

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
      screen.getByRole("button", {
        name: "Isochrone from a point. This tool arrives in a later release.",
      }),
    ).toHaveAttribute("aria-disabled", "true");
  });

  it("places a text feature with empty text and focuses the input", async () => {
    const fakeMap = createFakeMap();
    render(<AnnotateHarness fakeMap={fakeMap} />);

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Place text" }));
    act(() => {
      fakeMap.emitClick(29.2, -1.7);
    });

    const textInput = screen.getByRole("textbox", { name: "Annotation text" });
    expect(textInput).toHaveValue("");
    expect(textInput).toHaveFocus();
  });

  it("focuses the text input after placing a second text feature", async () => {
    const fakeMap = createFakeMap();
    render(<AnnotateHarness fakeMap={fakeMap} />);

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Place text" }));
    act(() => {
      fakeMap.emitClick(29.2, -1.7);
    });
    const firstInput = screen.getByRole("textbox", { name: "Annotation text" });
    expect(firstInput).toHaveFocus();
    act(() => {
      firstInput.blur();
    });

    fireEvent.click(screen.getByRole("button", { name: "Place text" }));
    act(() => {
      fakeMap.emitClick(30.2, -2.7);
    });

    const secondInput = screen.getByRole("textbox", {
      name: "Annotation text",
    });
    expect(secondInput).toHaveValue("");
    expect(secondInput).toHaveFocus();
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
      fakeMap.emitClick(0, 0);
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
    act(() => {
      fakeMap.emitPointerDown(0, 0);
      emitWindowPointer("pointerup");
    });

    expect(
      screen.queryByRole("button", { name: "Annotations" }),
    ).not.toBeInTheDocument();
    expect(fakeMap.dragPan.enable).toHaveBeenCalled();
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
    act(() => {
      fakeMap.emitPointerDown(0, 0);
      emitWindowPointer("pointermove", 1, 1);
      emitWindowPointer("pointerup", 1, 1);
    });

    expect(screen.getByRole("button", { name: "Annotations" })).toBeVisible();
    expect(fakeMap.dragPan.enable).toHaveBeenCalled();
  });

  it("cancels an in-progress freehand stroke on pointercancel", async () => {
    const fakeMap = createFakeMap();
    render(<AnnotateHarness fakeMap={fakeMap} />);

    await openAnnotateSubCluster();
    fireEvent.click(screen.getByRole("button", { name: "Draw freehand" }));
    act(() => {
      fakeMap.emitPointerDown(4, 4);
      emitWindowPointer("pointermove", 5, 5);
      emitWindowPointer("pointercancel", 5, 5);
    });

    expect(
      screen.queryByRole("button", { name: "Annotations" }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("annotation-preview")).toHaveTextContent("[]");
    expect(fakeMap.dragPan.enable).toHaveBeenCalled();
  });

  it("commits an arrow from two clicks with default paint", async () => {
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
      fakeMap.emitClick(1, 1);
    });

    expect(config.annotations.features).toEqual([
      expect.objectContaining({
        kind: "arrow",
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [1, 1],
          ],
        },
        color: "#3b82f6",
        strokeWidthPx: 2,
      }),
    ]);
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
      fakeMap.emitClick(0, 0);
      fakeMap.emitClick(1, 0);
      fakeMap.emitClick(1, 1);
      fakeMap.emitClick(0, 1);
    });
    fireEvent.keyDown(window, { key: "Enter" });

    expect(config.aoi).toBeUndefined();
    expect(config.annotations.features).toEqual([
      expect.objectContaining({
        kind: "area",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
        color: "#3b82f6",
        opacity: 0.35,
      }),
    ]);
  });
});
