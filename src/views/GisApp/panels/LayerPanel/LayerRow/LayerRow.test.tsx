import { DragDropProvider } from "@dnd-kit/react";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { LayerRow } from "@/views/GisApp/panels/LayerPanel/LayerRow/LayerRow";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";

vi.mock(
  "@/views/GisApp/panels/LayerPanel/LayerActionsMenu/LayerActionsMenu",
  () => {
    return {
      LayerActionsMenu: () => {
        return null;
      },
    };
  },
);

const VIEW_STATE: MapLayerViewState = {
  status: "ready",
  error: undefined,
  featureCount: 1,
  droppedRowCount: 0,
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
});
