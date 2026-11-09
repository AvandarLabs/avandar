import { DragDropProvider } from "@dnd-kit/react";
import { describe, expect, it, vi } from "vitest";
import { uuid } from "$/lib/uuid";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { fireEvent, render, screen } from "@/test-utils";
import { LayerRow } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRow";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";

vi.mock(
  "@/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionsMenu",
  () => {
    return {
      LayerActionsMenu: ({
        onOpenFeatureList,
      }: {
        onOpenFeatureList?: () => void;
      }) => {
        return onOpenFeatureList ? <span>Feature list offered</span> : null;
      },
    };
  },
);

const VIEW_STATE: MapLayerViewState = {
  status: "ready",
  error: undefined,
  featureCount: 1,
  droppedRowCount: 0,
  drops: [],
  largestDropReason: undefined,
  filterCount: 0,
  onRetry: vi.fn(),
};

describe("LayerRow", () => {
  it("separates layer selection from visibility and exposes the selected state", () => {
    const layer = MapLayer.makeEmpty("Transit stops");
    const onSelect = vi.fn();
    const onToggleVisible = vi.fn();

    render(
      <DragDropProvider>
        <LayerRow
          layer={layer}
          viewState={VIEW_STATE}
          isSelected
          rowIndex={0}
          onSelect={onSelect}
          onToggleVisible={onToggleVisible}
          onMoveByOffset={vi.fn()}
          onRename={vi.fn()}
          onDuplicate={vi.fn()}
          onZoomToLayer={vi.fn()}
          onDelete={vi.fn()}
        />
      </DragDropProvider>,
    );

    const selectButton = screen.getByRole("button", {
      name: "Transit stops 1 point",
    });
    expect(selectButton).toHaveAttribute("aria-current", "true");

    fireEvent.click(selectButton);
    fireEvent.click(
      screen.getByRole("button", { name: "Hide the layer Transit stops" }),
    );

    expect(onSelect).toHaveBeenCalledOnce();
    expect(onToggleVisible).toHaveBeenCalledOnce();
  });

  it("moves the focused layer with the keyboard reorder shortcut", () => {
    const layer = MapLayer.makeEmpty("Transit stops");
    const onMoveByOffset = vi.fn();

    render(
      <DragDropProvider>
        <LayerRow
          layer={layer}
          viewState={VIEW_STATE}
          isSelected={false}
          rowIndex={1}
          onSelect={vi.fn()}
          onToggleVisible={vi.fn()}
          onMoveByOffset={onMoveByOffset}
          onRename={vi.fn()}
          onDuplicate={vi.fn()}
          onZoomToLayer={vi.fn()}
          onDelete={vi.fn()}
        />
      </DragDropProvider>,
    );

    const selectButton = screen.getByRole("button", {
      name: "Transit stops 1 point",
    });
    fireEvent.keyDown(selectButton, { key: "ArrowUp", altKey: true });
    fireEvent.keyDown(selectButton, { key: "ArrowDown", altKey: true });

    expect(onMoveByOffset).toHaveBeenNthCalledWith(1, -1);
    expect(onMoveByOffset).toHaveBeenNthCalledWith(2, 1);
    expect(selectButton).toHaveAttribute(
      "aria-keyshortcuts",
      "Alt+ArrowUp Alt+ArrowDown",
    );
  });

  it("exposes the drag handle as a keyboard sensor control", () => {
    const layer = MapLayer.makeEmpty("Transit stops");

    render(
      <DragDropProvider>
        <LayerRow
          layer={layer}
          viewState={VIEW_STATE}
          isSelected={false}
          rowIndex={0}
          onSelect={vi.fn()}
          onToggleVisible={vi.fn()}
          onMoveByOffset={vi.fn()}
          onRename={vi.fn()}
          onDuplicate={vi.fn()}
          onZoomToLayer={vi.fn()}
          onDelete={vi.fn()}
        />
      </DragDropProvider>,
    );

    const handle = screen.getByRole("button", {
      name: "Reorder layer Transit stops",
    });
    const instructions = document.getElementById(
      handle.getAttribute("aria-describedby") ?? "",
    );

    expect(handle).toHaveAttribute("aria-keyshortcuts", "Space Enter");
    expect(instructions).toHaveTextContent(
      "Press Space or Enter to start dragging. Use the arrow keys to move the layer, then press Space or Enter to drop, or Escape to cancel.",
    );
  });

  it.each([
    { mode: "exact" as const, isOffered: true },
    { mode: "aggregateOnly" as const, isOffered: false },
  ])(
    "offers a feature list for a $mode point layer: $isOffered",
    ({ mode, isOffered }) => {
      const pointLayer: MapLayer.T = {
        ...MapLayer.makeEmpty("Schools"),
        geoBinding: {
          type: "latLngColumns",
          latitude: uuid<QueryColumn.Id>(),
          longitude: uuid<QueryColumn.Id>(),
        },
      };
      const layer =
        mode === "exact"
          ? pointLayer
          : MapLayer.withSensitivity(pointLayer, {
              mode,
              minCellCount: 5,
              minGeoLevel: "district",
            });
      render(
        <DragDropProvider>
          <LayerRow
            layer={layer}
            viewState={VIEW_STATE}
            isSelected={false}
            rowIndex={0}
            onSelect={vi.fn()}
            onToggleVisible={vi.fn()}
            onMoveByOffset={vi.fn()}
            onRename={vi.fn()}
            onDuplicate={vi.fn()}
            onZoomToLayer={vi.fn()}
            onDelete={vi.fn()}
            onOpenFeatureList={vi.fn()}
          />
        </DragDropProvider>,
      );

      expect(screen.queryByText("Feature list offered") !== null).toBe(
        isOffered,
      );
    },
  );
});
