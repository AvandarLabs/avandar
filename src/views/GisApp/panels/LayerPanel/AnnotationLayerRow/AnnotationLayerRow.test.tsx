import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ReactNode } from "react";

import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

/**
 * Pinned annotation row: first feature creates it, last delete removes it.
 */
import { uuid } from "$/lib/uuid";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen, within } from "@/test-utils";
import { AnnotationLayerRow } from "@/views/GisApp/panels/LayerPanel/AnnotationLayerRow/AnnotationLayerRow";
import { LayerList } from "@/views/GisApp/panels/LayerPanel/LayerList/LayerList";
import { LayerPanel } from "@/views/GisApp/panels/LayerPanel/LayerPanel";

const sortableMock = vi.hoisted(() => {
  return {
    useSortable: vi.fn(() => {
      return { ref: undefined, handleRef: undefined, isDragging: false };
    }),
  };
});

vi.mock("@dnd-kit/react/sortable", () => {
  return {
    useSortable: sortableMock.useSortable,
  };
});

function _readyViewState(): MapLayerViewState {
  return {
    status: "ready",
    error: undefined,
    featureCount: 1,
    droppedRowCount: 0,
    drops: [],
    largestDropReason: undefined,
    filterCount: 0,
    onRetry: vi.fn(),
  };
}

function _makeTextFeature(): AvaMapConfig.AnnotationFeature {
  return {
    id: uuid<AvaMapConfig.AnnotationFeatureId>(),
    kind: "text",
    geometry: { type: "Point", coordinates: [10, 10] },
    text: "Label",
    sizePx: 14,
    color: "#3b82f6",
  };
}

const firstLayer = MapLayer.makeEmpty("First layer");
const secondLayer = MapLayer.makeEmpty("Second layer");

const LIST_PROPS = {
  rows: [firstLayer, secondLayer],
  viewStates: new Map([
    [firstLayer.id, _readyViewState()],
    [secondLayer.id, _readyViewState()],
  ]),
  selectedLayerId: undefined as MapLayer.Id | undefined,
  onStackOrderChange: vi.fn(),
  onSelectLayer: vi.fn(),
  onToggleLayerVisible: vi.fn(),
  onRenameLayer: vi.fn(),
  onDuplicateLayer: vi.fn(),
  onZoomToLayer: vi.fn(),
  onDeleteLayer: vi.fn(),
};

describe("AnnotationLayerRow", () => {
  it("does not render when there are no annotation features", () => {
    render(
      <LayerList
        {...LIST_PROPS}
        annotations={{ isVisible: true, features: [] }}
        annotationsZIndex={2}
        isAnnotationRowSelected={false}
        onSelectAnnotationRow={vi.fn()}
        onToggleAnnotationsVisible={vi.fn()}
        onMoveAnnotationsByOffset={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Annotations" }),
    ).not.toBeInTheDocument();
  });

  it("names the pinned row Annotations", () => {
    render(
      <LayerList
        {...LIST_PROPS}
        annotations={{ isVisible: true, features: [_makeTextFeature()] }}
        annotationsZIndex={2}
        isAnnotationRowSelected={false}
        onSelectAnnotationRow={vi.fn()}
        onToggleAnnotationsVisible={vi.fn()}
        onMoveAnnotationsByOffset={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Annotations" })).toBeVisible();
  });

  it("removes the row after the last feature is deleted", () => {
    const feature = _makeTextFeature();
    function Harness(): ReactNode {
      const [annotations, setAnnotations] =
        useState<AvaMapConfig.AnnotationLayer>({
          isVisible: true,
          features: [feature],
        });
      return (
        <>
          <LayerList
            {...LIST_PROPS}
            annotations={annotations}
            annotationsZIndex={2}
            isAnnotationRowSelected
            onSelectAnnotationRow={vi.fn()}
            onToggleAnnotationsVisible={vi.fn()}
            onMoveAnnotationsByOffset={vi.fn()}
          />
          <button
            type="button"
            onClick={() => {
              setAnnotations({ isVisible: true, features: [] });
            }}
          >
            delete-last
          </button>
        </>
      );
    }
    render(<Harness />);

    expect(screen.getByRole("button", { name: "Annotations" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "delete-last" }));
    expect(
      screen.queryByRole("button", { name: "Annotations" }),
    ).not.toBeInTheDocument();
  });

  it("toggles annotations.isVisible from the row", () => {
    const onToggleAnnotationsVisible = vi.fn();
    render(
      <AnnotationLayerRow
        isVisible
        isSelected={false}
        onSelect={vi.fn()}
        onToggleVisible={onToggleAnnotationsVisible}
        onMoveByOffset={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Hide the layer Annotations" }),
    );

    expect(onToggleAnnotationsVisible).toHaveBeenCalledOnce();
  });

  it("moves z-index with Alt+Arrow", () => {
    const onMoveByOffset = vi.fn();
    render(
      <AnnotationLayerRow
        isVisible
        isSelected
        onSelect={vi.fn()}
        onToggleVisible={vi.fn()}
        onMoveByOffset={onMoveByOffset}
      />,
    );

    const selectButton = screen.getByRole("button", { name: "Annotations" });
    fireEvent.keyDown(selectButton, { key: "ArrowUp", altKey: true });
    fireEvent.keyDown(selectButton, { key: "ArrowDown", altKey: true });

    expect(onMoveByOffset).toHaveBeenNthCalledWith(1, -1);
    expect(onMoveByOffset).toHaveBeenNthCalledWith(2, 1);
  });

  it("inserts the row at layers.length minus annotationsZIndex", () => {
    render(
      <LayerList
        {...LIST_PROPS}
        annotations={{ isVisible: true, features: [_makeTextFeature()] }}
        annotationsZIndex={1}
        isAnnotationRowSelected={false}
        onSelectAnnotationRow={vi.fn()}
        onToggleAnnotationsVisible={vi.fn()}
        onMoveAnnotationsByOffset={vi.fn()}
      />,
    );

    const names = within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map((row) => {
        return row.textContent;
      });

    expect(names[0]).toContain("First layer");
    expect(names[1]).toContain("Annotations");
    expect(names[2]).toContain("Second layer");
  });

  it("does not expose Add layer on the annotation row", () => {
    const onAddLayerFromSource = vi.fn();
    render(
      <LayerPanel
        {...LIST_PROPS}
        annotations={{ isVisible: true, features: [_makeTextFeature()] }}
        annotationsZIndex={2}
        isAnnotationRowSelected
        isCollapsed={false}
        onToggleCollapsed={vi.fn()}
        onAddLayerFromSource={onAddLayerFromSource}
        onSelectAnnotationRow={vi.fn()}
        onToggleAnnotationsVisible={vi.fn()}
        onMoveAnnotationsByOffset={vi.fn()}
      />,
    );

    const annotationRow =
      screen.getByRole("button", { name: "Annotations" }).closest("li") ??
      undefined;
    expect(annotationRow).toBeTruthy();
    expect(
      within(annotationRow as HTMLElement).queryByRole("button", {
        name: "Add layer",
      }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add layer" })).toBeVisible();
    expect(onAddLayerFromSource).not.toHaveBeenCalled();
  });
});
