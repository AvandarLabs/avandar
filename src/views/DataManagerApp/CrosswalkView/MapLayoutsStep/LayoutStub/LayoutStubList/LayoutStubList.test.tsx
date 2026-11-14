import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import {
  LAYOUT_STUB_VIRTUAL_THRESHOLD,
  LayoutStubList,
} from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStubList/LayoutStubList";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

/** How many rows the mocked virtualizer says are in view. */
const WINDOW_SIZE = 12;

const { scrollToIndexMock, windowState } = vi.hoisted(() => {
  return {
    scrollToIndexMock: vi.fn(),
    /** The first row the mocked virtualizer says is in view. */
    windowState: { firstIndex: 0 },
  };
});

// jsdom lays nothing out, so a real virtualizer would render no rows. The
// mock renders a window of rows as in view (the first rows unless a test
// moves it) and records scrolling, as DataCatalogListingList's test does.
vi.mock("@tanstack/react-virtual", () => {
  return {
    useVirtualizer: (options: { count: number }) => {
      return {
        getTotalSize: () => {
          return options.count * 52;
        },
        getVirtualItems: () => {
          return Array.from(
            { length: Math.min(options.count, WINDOW_SIZE) },
            (_item, offset) => {
              const index = windowState.firstIndex + offset;
              return {
                index,
                key: index,
                start: index * 52,
                size: 52,
                end: (index + 1) * 52,
                lane: 0,
              };
            },
          );
        },
        measureElement: () => {},
        scrollToIndex: scrollToIndexMock,
      };
    },
  };
});

function _makeLayouts(count: number): CrosswalkDraft.Layout[] {
  return Array.from({ length: count }, (_item, index) => {
    return {
      id: `layout-${index}` as CrosswalkLayout.Id,
      key: `key-${index}`,
      signature: `l1.${index}`,
      columnNames: [`column_${index}`],
      isReference: index === 0,
      status: index === 0 ? "mapped" : "to_do",
      datasetIds: [`dataset-${index}` as Dataset.Id],
    };
  });
}

/** One dataset per layout, named "Dataset <index>", so each row has a name. */
function _makeDatasetsById(
  layouts: readonly CrosswalkDraft.Layout[],
): ReadonlyMap<string, CrosswalkLayout.Dataset> {
  return new Map(
    layouts.map((layout, index) => {
      const datasetId = layout.datasetIds[0] as Dataset.Id;
      return [
        datasetId,
        { id: datasetId, name: `Dataset ${index}`, columns: [] },
      ] as const;
    }),
  );
}

function _render(options: Readonly<{ count: number; selectedIndex?: number }>) {
  const layouts = _makeLayouts(options.count);
  const onSelectLayout = vi.fn();
  const props = {
    layouts,
    datasetsById: _makeDatasetsById(layouts),
    onSelectLayout,
  };
  const rendered = render(
    <LayoutStubList
      {...props}
      selectedLayoutId={layouts[options.selectedIndex ?? 0]?.id}
    />,
  );
  const rerenderWithSelection = (index: number) => {
    rendered.rerender(
      <LayoutStubList {...props} selectedLayoutId={layouts[index]?.id} />,
    );
  };
  return { layouts, onSelectLayout, rerenderWithSelection };
}

function _listbox(): HTMLElement {
  return screen.getByRole("listbox", { name: "Map each dataset" });
}

/** The rendered option of the layout whose dataset is "Dataset <index>". */
function _option(index: number): HTMLElement {
  const option = screen
    .getByText(`Dataset ${index}`)
    .closest<HTMLElement>('[role="option"]');
  if (!option) {
    throw new Error(`No option holds Dataset ${index}`);
  }
  return option;
}

describe("LayoutStubList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    windowState.firstIndex = 0;
  });

  it("renders every row up to the threshold, as before", () => {
    _render({ count: LAYOUT_STUB_VIRTUAL_THRESHOLD });

    expect(screen.getAllByRole("option")).toHaveLength(
      LAYOUT_STUB_VIRTUAL_THRESHOLD,
    );
    expect(_option(3)).not.toHaveAttribute("aria-setsize");
  });

  it("renders only the rows in view past the threshold, each saying where it sits", () => {
    _render({ count: 150 });

    expect(screen.getAllByRole("option")).toHaveLength(WINDOW_SIZE);
    expect(_option(3)).toHaveAttribute("aria-setsize", "150");
    expect(_option(3)).toHaveAttribute("aria-posinset", "4");
    expect(_option(0)).toHaveAttribute("aria-selected", "true");
    expect(_option(1)).toHaveAttribute("aria-selected", "false");
  });

  it("moves the active row with the keys and scrolls it in through the virtualizer", () => {
    _render({ count: 150 });

    fireEvent.keyDown(_listbox(), { key: "ArrowDown" });

    expect(_listbox()).toHaveAttribute("aria-activedescendant", _option(1).id);
    expect(scrollToIndexMock).toHaveBeenLastCalledWith(1, { align: "auto" });

    fireEvent.keyDown(_listbox(), { key: "End" });
    expect(scrollToIndexMock).toHaveBeenLastCalledWith(149, { align: "auto" });
  });

  it("selects the active row with Enter", () => {
    const { layouts, onSelectLayout } = _render({ count: 150 });

    fireEvent.keyDown(_listbox(), { key: "ArrowDown" });
    fireEvent.keyDown(_listbox(), { key: "Enter" });

    expect(onSelectLayout).toHaveBeenLastCalledWith(layouts[1]?.id);
  });

  it("selects a row by clicking it", () => {
    const { layouts, onSelectLayout } = _render({ count: 150 });

    fireEvent.click(screen.getByText("Dataset 5"));

    expect(onSelectLayout).toHaveBeenLastCalledWith(layouts[5]?.id);
  });

  it("scrolls a layout selected from outside into view", () => {
    const { rerenderWithSelection } = _render({ count: 150 });

    rerenderWithSelection(120);

    expect(scrollToIndexMock).toHaveBeenLastCalledWith(120, { align: "auto" });
  });

  it("points at no row while the active row is outside the rendered window", () => {
    const { rerenderWithSelection } = _render({ count: 150 });

    rerenderWithSelection(120);

    expect(_listbox()).not.toHaveAttribute("aria-activedescendant");
  });

  it("points at the active row once the window reaches it", () => {
    const { layouts, rerenderWithSelection } = _render({ count: 150 });
    rerenderWithSelection(120);

    windowState.firstIndex = 115;
    rerenderWithSelection(120);

    expect(_listbox().getAttribute("aria-activedescendant")).toContain(
      layouts[120]?.id,
    );
  });

  it("never asks the virtualizer to scroll a short list", () => {
    _render({ count: 10 });

    fireEvent.keyDown(_listbox(), { key: "ArrowDown" });

    expect(_listbox()).toHaveAttribute("aria-activedescendant", _option(1).id);
    expect(scrollToIndexMock).not.toHaveBeenCalled();
  });
});
