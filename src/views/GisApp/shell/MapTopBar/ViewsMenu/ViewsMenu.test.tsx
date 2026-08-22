import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { ViewsMenu } from "@/views/GisApp/shell/MapTopBar/ViewsMenu/ViewsMenu";
import type { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";

const BOOKMARK = {
  id: "00000000-0000-4000-8000-000000000001" as AvaMapConfig.BookmarkId,
  name: "Response overview",
  view: { center: [-74.006, 40.7128], zoom: 10 },
} as const satisfies AvaMapConfig.Bookmark;

describe("ViewsMenu", () => {
  it("saves the current view and navigates to a saved view", async () => {
    const onSaveCurrentView = vi.fn();
    const onGoToBookmark = vi.fn();

    render(
      <ViewsMenu
        bookmarks={[BOOKMARK]}
        onSaveCurrentView={onSaveCurrentView}
        onGoToBookmark={onGoToBookmark}
        onRemoveBookmark={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Views" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Save the current view" }),
    );
    fireEvent.click(await screen.findByText("Response overview"));

    expect(onSaveCurrentView).toHaveBeenCalledOnce();
    expect(onGoToBookmark).toHaveBeenCalledWith(BOOKMARK);
  });

  it("removes a saved view without navigating to it", async () => {
    const onGoToBookmark = vi.fn();
    const onRemoveBookmark = vi.fn();

    render(
      <ViewsMenu
        bookmarks={[BOOKMARK]}
        onSaveCurrentView={vi.fn()}
        onGoToBookmark={onGoToBookmark}
        onRemoveBookmark={onRemoveBookmark}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Views" }));
    fireEvent.click(
      await screen.findByRole("button", {
        name: "Delete the view Response overview",
      }),
    );

    expect(onRemoveBookmark).toHaveBeenCalledWith(BOOKMARK.id);
    expect(onGoToBookmark).not.toHaveBeenCalled();
  });
});
