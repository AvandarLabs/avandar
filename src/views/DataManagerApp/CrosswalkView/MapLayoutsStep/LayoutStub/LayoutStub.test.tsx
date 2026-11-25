import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@/test-utils";
import { CONTEXT } from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalk.fixtures";
import {
  BRONX_LAYOUT,
  BRONX_LAYOUT_ID,
  KINGS_LAYOUT,
  KINGS_LAYOUT_ID,
  makeMappedDraft,
} from "@/views/DataManagerApp/CrosswalkView/__tests__/crosswalkSteps.fixtures";
import { LayoutStub } from "@/views/DataManagerApp/CrosswalkView/MapLayoutsStep/LayoutStub/LayoutStub";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactElement } from "react";

function _renderStub(
  draft: CrosswalkDraft.T = makeMappedDraft(),
  selectedLayoutId: CrosswalkLayout.Id = BRONX_LAYOUT_ID,
) {
  const onSelectLayout = vi.fn();
  const buildStub = (selected: CrosswalkLayout.Id): ReactElement => {
    return (
      <LayoutStub
        draft={draft}
        datasetsById={CONTEXT.datasetsById}
        selectedLayoutId={selected}
        onSelectLayout={onSelectLayout}
      />
    );
  };
  const { rerender } = render(buildStub(selectedLayoutId));
  return {
    onSelectLayout,
    selectLayoutFromOutside: (selected: CrosswalkLayout.Id) => {
      rerender(buildStub(selected));
    },
  };
}

/** The listbox and its two options: Bronx, then Kings. */
function _getList() {
  const list = screen.getByRole("listbox", { name: "Map each dataset" });
  const [bronx, kings] = within(list).getAllByRole("option");
  return { list, bronx, kings };
}

describe("LayoutStub", () => {
  it("shows how many datasets are mapped", () => {
    _renderStub();

    // Bronx is the reference (1 dataset); Kings (2 datasets) is in review.
    expect(
      screen.getByRole("progressbar", { name: "1 of 3 mapped" }),
    ).toBeInTheDocument();
  });

  it("lists every layout with its name, count, and stamp, the selected one marked", () => {
    _renderStub();

    const list = screen.getByRole("listbox", { name: "Map each dataset" });
    const [bronx, kings] = within(list).getAllByRole("option");
    expect(bronx).toHaveAccessibleName(/Bronx line list.*Reference/);
    expect(bronx).toHaveAttribute("aria-selected", "true");
    expect(kings).toHaveAccessibleName(
      /Kings line list 2026-03.*\+1 with the same layout.*Review/,
    );
    expect(kings).toHaveAttribute("aria-selected", "false");
  });

  it("keeps a skipped layout in the list", () => {
    _renderStub(
      makeMappedDraft({
        layouts: [BRONX_LAYOUT, { ...KINGS_LAYOUT, status: "skipped" }],
      }),
    );

    expect(
      screen.getByRole("option", { name: /Kings line list 2026-03.*Skipped/ }),
    ).toBeInTheDocument();
  });

  it("selects a layout on click", () => {
    const { onSelectLayout } = _renderStub();

    fireEvent.click(screen.getByRole("option", { name: /Kings line list/ }));

    expect(onSelectLayout).toHaveBeenCalledWith(KINGS_LAYOUT_ID);
  });

  it("starts on the selected layout and moves with the arrow keys without selecting", () => {
    const { onSelectLayout } = _renderStub();
    const { list, bronx, kings } = _getList();

    expect(list).toHaveAttribute("aria-activedescendant", bronx?.id);
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(list).toHaveAttribute("aria-activedescendant", kings?.id);
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(list).toHaveAttribute("aria-activedescendant", kings?.id);
    fireEvent.keyDown(list, { key: "ArrowUp" });
    expect(list).toHaveAttribute("aria-activedescendant", bronx?.id);
    expect(onSelectLayout).not.toHaveBeenCalled();
  });

  it("jumps to the first and last layout with Home and End", () => {
    _renderStub();
    const { list, bronx, kings } = _getList();

    fireEvent.keyDown(list, { key: "End" });
    expect(list).toHaveAttribute("aria-activedescendant", kings?.id);
    fireEvent.keyDown(list, { key: "Home" });
    expect(list).toHaveAttribute("aria-activedescendant", bronx?.id);
  });

  it("selects the active layout with Enter or Space", () => {
    const { onSelectLayout } = _renderStub();
    const { list } = _getList();

    fireEvent.keyDown(list, { key: "ArrowDown" });
    fireEvent.keyDown(list, { key: "Enter" });
    expect(onSelectLayout).toHaveBeenLastCalledWith(KINGS_LAYOUT_ID);

    fireEvent.keyDown(list, { key: "Home" });
    fireEvent.keyDown(list, { key: " " });
    expect(onSelectLayout).toHaveBeenLastCalledWith(BRONX_LAYOUT_ID);
  });

  it("moves the active layout to a selection made from outside", () => {
    const { selectLayoutFromOutside } = _renderStub();
    const { list, bronx, kings } = _getList();
    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(list).toHaveAttribute("aria-activedescendant", kings?.id);

    selectLayoutFromOutside(KINGS_LAYOUT_ID);
    expect(kings).toHaveAttribute("aria-selected", "true");
    expect(list).toHaveAttribute("aria-activedescendant", kings?.id);

    selectLayoutFromOutside(BRONX_LAYOUT_ID);
    expect(list).toHaveAttribute("aria-activedescendant", bronx?.id);
  });
});
