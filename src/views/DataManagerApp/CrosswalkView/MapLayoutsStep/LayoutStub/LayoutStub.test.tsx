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
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";

function _renderStub(draft: CrosswalkDraft.T = makeMappedDraft()) {
  const onSelectLayout = vi.fn();
  render(
    <LayoutStub
      draft={draft}
      datasetsById={CONTEXT.datasetsById}
      selectedLayoutId={BRONX_LAYOUT_ID}
      onSelectLayout={onSelectLayout}
    />,
  );
  return { onSelectLayout };
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

  it("moves with the arrow keys and selects with Enter", () => {
    const { onSelectLayout } = _renderStub();
    const list = screen.getByRole("listbox", { name: "Map each dataset" });
    const [bronx, kings] = within(list).getAllByRole("option");

    fireEvent.focus(list);
    expect(list).toHaveAttribute("aria-activedescendant", bronx?.id);

    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(list).toHaveAttribute("aria-activedescendant", kings?.id);
    expect(onSelectLayout).not.toHaveBeenCalled();

    fireEvent.keyDown(list, { key: "ArrowDown" });
    expect(list).toHaveAttribute("aria-activedescendant", kings?.id);

    fireEvent.keyDown(list, { key: "Enter" });
    expect(onSelectLayout).toHaveBeenCalledWith(KINGS_LAYOUT_ID);

    fireEvent.keyDown(list, { key: "Home" });
    expect(list).toHaveAttribute("aria-activedescendant", bronx?.id);
    fireEvent.keyDown(list, { key: "End" });
    fireEvent.keyDown(list, { key: " " });
    expect(onSelectLayout).toHaveBeenLastCalledWith(KINGS_LAYOUT_ID);
  });
});
