import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { UserMentionList } from "@/components/RichText/UserMention/UserMentionList";
import { act, render, screen, waitFor } from "@/test-utils";
import type { UserMentionListHandle } from "@/components/RichText/UserMention/UserMentionList";

const ITEMS = [
  { userId: "1", displayName: "Priya Natarajan", email: "priya.n@example.org" },
  { userId: "2", displayName: "Priscilla Owusu", email: "p.owusu@example.org" },
];

function _rect(): DOMRect {
  return new DOMRect(10, 10, 0, 16);
}

function _pressKey(
  ref: React.RefObject<UserMentionListHandle | null>,
  key: string,
): boolean {
  let isHandled = false;
  act(() => {
    isHandled =
      ref.current?.onKeyDown(new KeyboardEvent("keydown", { key })) ?? false;
  });
  return isHandled;
}

describe("UserMentionList", () => {
  it("lists matching members with their email", async () => {
    render(
      <UserMentionList items={ITEMS} clientRect={_rect} command={vi.fn()} />,
    );
    expect(await screen.findByText("Priya Natarajan")).toBeInTheDocument();
    expect(screen.getByText("p.owusu@example.org")).toBeInTheDocument();
  });

  it("mentions the highlighted member on Enter after moving down", async () => {
    const command = vi.fn();
    const ref = createRef<UserMentionListHandle>();
    render(
      <UserMentionList
        ref={ref}
        items={ITEMS}
        clientRect={_rect}
        command={command}
      />,
    );
    await screen.findByText("Priya Natarajan");
    _pressKey(ref, "ArrowDown");
    _pressKey(ref, "Enter");
    await waitFor(() => {
      expect(command).toHaveBeenCalledWith({ id: "2" });
    });
  });

  it("says so when nobody matches", async () => {
    render(<UserMentionList items={[]} clientRect={_rect} command={vi.fn()} />);
    expect(await screen.findByText("No teammates match")).toBeInTheDocument();
  });

  it("keeps arrow keys away from the editor when nobody matches", async () => {
    const ref = createRef<UserMentionListHandle>();
    render(
      <UserMentionList
        ref={ref}
        items={[]}
        clientRect={_rect}
        command={vi.fn()}
      />,
    );
    await screen.findByText("No teammates match");
    expect(_pressKey(ref, "ArrowDown")).toBe(true);
    expect(_pressKey(ref, "ArrowUp")).toBe(true);
    expect(_pressKey(ref, "Enter")).toBe(false);
  });

  it("lets Enter with a modifier fall through to the editor", async () => {
    const command = vi.fn();
    const ref = createRef<UserMentionListHandle>();
    render(
      <UserMentionList
        ref={ref}
        items={ITEMS}
        clientRect={_rect}
        command={command}
      />,
    );
    await screen.findByText("Priya Natarajan");
    let isHandled = true;
    act(() => {
      isHandled =
        ref.current?.onKeyDown(
          new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true }),
        ) ?? true;
    });
    expect(isHandled).toBe(false);
    expect(command).not.toHaveBeenCalled();
  });

  it("makes the editing area a combobox pointing at the highlighted option", async () => {
    const editingArea = _createEditingArea();
    const ref = createRef<UserMentionListHandle>();
    render(
      <UserMentionList
        ref={ref}
        items={ITEMS}
        clientRect={_rect}
        command={vi.fn()}
        editingArea={editingArea}
      />,
    );
    await screen.findByText("Priya Natarajan");
    const listboxId = screen.getByRole("listbox").id;
    const [firstOption, secondOption] = screen.getAllByRole("option");
    expect(listboxId).not.toBe("");
    expect(editingArea).toHaveAttribute("role", "combobox");
    expect(editingArea).toHaveAttribute("aria-expanded", "true");
    expect(editingArea).toHaveAttribute("aria-autocomplete", "list");
    expect(editingArea).toHaveAttribute("aria-controls", listboxId);
    expect(editingArea).toHaveAttribute(
      "aria-activedescendant",
      firstOption?.id,
    );
    expect(firstOption).toHaveAttribute("aria-selected", "true");

    _pressKey(ref, "ArrowDown");
    expect(editingArea).toHaveAttribute(
      "aria-activedescendant",
      secondOption?.id,
    );
    expect(secondOption).toHaveAttribute("aria-selected", "true");
  });

  it("restores the editing area's role and drops the combobox attributes on unmount", async () => {
    const editingArea = _createEditingArea();
    const { unmount } = render(
      <UserMentionList
        items={ITEMS}
        clientRect={_rect}
        command={vi.fn()}
        editingArea={editingArea}
      />,
    );
    await screen.findByText("Priya Natarajan");
    unmount();
    expect(editingArea).toHaveAttribute("role", "textbox");
    [
      "aria-activedescendant",
      "aria-autocomplete",
      "aria-controls",
      "aria-expanded",
    ].forEach((attribute) => {
      expect(editingArea).not.toHaveAttribute(attribute);
    });
  });
});

function _createEditingArea(): HTMLElement {
  const editingArea = document.createElement("div");
  editingArea.setAttribute("role", "textbox");
  return editingArea;
}
