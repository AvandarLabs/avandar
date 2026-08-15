import { assertIsDefined } from "@avandar/utils";
import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { MapLayer } from "$/models/AvaMap/MapLayer/MapLayer";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import { LayerList } from "@/views/GisApp/panels/LayerPanel/LayerList/LayerList";
import { makeStackOrderFromLayerMove } from "@/views/GisApp/panels/LayerPanel/makeStackOrderFromLayerMove/makeStackOrderFromLayerMove";
import type { MapLayerViewState } from "@/views/GisApp/layers/MapLayerViewState.types";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  layer: MapLayer.T;
  viewState: MapLayerViewState;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisible: () => void;
  onMoveByOffset: (offset: -1 | 1) => void;
  onRename: () => void;
  onDuplicate: () => void;
  onZoomToLayer: () => void;
  onDelete: () => void;
};

type DragEndHandler = NonNullable<
  ComponentProps<typeof DragDropProvider>["onDragEnd"]
>;

const dndMocks = vi.hoisted(() => {
  return {
    onDragEnd: undefined as DragEndHandler | undefined,
  };
});

vi.mock("@/views/GisApp/panels/LayerPanel/LayerRow/LayerRow", () => {
  return {
    LayerRow: ({
      layer,
      viewState,
      isSelected,
      onSelect,
      onToggleVisible,
      onMoveByOffset,
      onRename,
      onDuplicate,
      onZoomToLayer,
      onDelete,
    }: Props): ReactNode => {
      return (
        <li data-selected={isSelected} data-status={viewState.status}>
          <span>{layer.name}</span>
          <button onClick={onSelect}>select</button>
          <button onClick={onToggleVisible}>visible</button>
          <button
            onClick={() => {
              onMoveByOffset(-1);
            }}
          >
            move-up
          </button>
          <button onClick={onRename}>rename</button>
          <button onClick={onDuplicate}>duplicate</button>
          <button onClick={onZoomToLayer}>zoom</button>
          <button onClick={onDelete}>delete</button>
        </li>
      );
    },
  };
});
vi.mock("@dnd-kit/react", () => {
  return {
    DragDropProvider: ({
      children,
      onDragEnd,
    }: {
      children: ReactNode;
      onDragEnd?: DragEndHandler;
    }): ReactNode => {
      dndMocks.onDragEnd = onDragEnd;
      return children;
    },
  };
});
vi.mock(
  "@/views/GisApp/panels/LayerPanel/makeStackOrderFromLayerMove/makeStackOrderFromLayerMove",
  () => {
    return {
      makeStackOrderFromLayerMove: vi.fn(),
    };
  },
);

vi.mock("@dnd-kit/helpers", () => {
  return {
    move: vi.fn(),
  };
});

function _makeViewState(
  status: MapLayerViewState["status"],
): MapLayerViewState {
  return {
    status,
    error: undefined,
    featureCount: 1,
    droppedRowCount: 0,
    largestDropReason: undefined,
    filterCount: 0,
    onRetry: vi.fn(),
  };
}

const firstLayer = MapLayer.makeEmpty("First layer");
const secondLayer = MapLayer.makeEmpty("Second layer");
const LAYERS = [firstLayer, secondLayer];

const LIST_PROPS = {
  rows: LAYERS,
  viewStates: new Map([
    [firstLayer.id, _makeViewState("ready")],
    [secondLayer.id, _makeViewState("loading")],
  ]),
  selectedLayerId: undefined,
  onStackOrderChange: vi.fn(),
  onSelectLayer: vi.fn(),
  onToggleLayerVisible: vi.fn(),
  onRenameLayer: vi.fn(),
  onDuplicateLayer: vi.fn(),
  onZoomToLayer: vi.fn(),
  onDeleteLayer: vi.fn(),
};

describe("LayerList", () => {
  it("explains that the panel is empty", () => {
    render(<LayerList {...LIST_PROPS} rows={[]} viewStates={new Map()} />);

    expect(screen.getByText("No layers yet.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("renders rows in stack order", () => {
    render(<LayerList {...LIST_PROPS} />);

    const rowNames = within(screen.getByRole("list"))
      .getAllByRole("listitem")
      .map((row) => {
        return row.querySelector("span")?.textContent;
      });

    expect(rowNames).toEqual(["First layer", "Second layer"]);
  });

  it("routes every row action to the layer id", () => {
    const callbacks = {
      onSelectLayer: vi.fn(),
      onToggleLayerVisible: vi.fn(),
      onRenameLayer: vi.fn(),
      onDuplicateLayer: vi.fn(),
      onZoomToLayer: vi.fn(),
      onDeleteLayer: vi.fn(),
    };

    render(<LayerList {...LIST_PROPS} {...callbacks} />);
    const secondRow =
      screen.getByText("Second layer").parentElement ?? undefined;
    assertIsDefined(secondRow, { name: "second layer row" });

    fireEvent.click(within(secondRow).getByRole("button", { name: "select" }));
    fireEvent.click(within(secondRow).getByRole("button", { name: "visible" }));
    fireEvent.click(within(secondRow).getByRole("button", { name: "rename" }));
    fireEvent.click(
      within(secondRow).getByRole("button", { name: "duplicate" }),
    );
    fireEvent.click(within(secondRow).getByRole("button", { name: "zoom" }));
    fireEvent.click(within(secondRow).getByRole("button", { name: "delete" }));

    expect(callbacks.onSelectLayer).toHaveBeenCalledWith(secondLayer.id);
    expect(callbacks.onToggleLayerVisible).toHaveBeenCalledWith(secondLayer.id);
    expect(callbacks.onRenameLayer).toHaveBeenCalledWith(secondLayer.id);
    expect(callbacks.onDuplicateLayer).toHaveBeenCalledWith(secondLayer.id);
    expect(callbacks.onZoomToLayer).toHaveBeenCalledWith(secondLayer.id);
    expect(callbacks.onDeleteLayer).toHaveBeenCalledWith(secondLayer.id);
  });

  it("reorders through the keyboard move helper and drag end", () => {
    const movedByShortcut = [secondLayer.id, firstLayer.id];
    vi.mocked(makeStackOrderFromLayerMove).mockReturnValue(movedByShortcut);
    vi.mocked(move).mockReturnValue(movedByShortcut);
    const onStackOrderChange = vi.fn();

    render(
      <LayerList {...LIST_PROPS} onStackOrderChange={onStackOrderChange} />,
    );
    const firstRow = screen.getByText("First layer").parentElement ?? undefined;
    assertIsDefined(firstRow, { name: "first layer row" });
    fireEvent.click(within(firstRow).getByRole("button", { name: "move-up" }));
    _triggerDragEnd({
      sourceId: firstLayer.id,
      targetId: secondLayer.id,
    });

    expect(onStackOrderChange).toHaveBeenNthCalledWith(1, movedByShortcut);
    expect(onStackOrderChange).toHaveBeenNthCalledWith(2, movedByShortcut);
  });
});

/** Invokes LayerList's drag-end callback with the data it reads. */
function _triggerDragEnd({
  sourceId,
  targetId,
}: {
  sourceId: MapLayer.Id;
  targetId: MapLayer.Id;
}): void {
  assertIsDefined(dndMocks.onDragEnd, { name: "drag-end callback" });
  const event = {
    operation: {
      canceled: false,
      source: { id: sourceId },
      target: { id: targetId },
    },
  };
  Reflect.apply(dndMocks.onDragEnd, undefined, [event, undefined]);
}
