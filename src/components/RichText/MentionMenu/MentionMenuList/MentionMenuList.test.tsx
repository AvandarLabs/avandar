import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { buildMentionMenuGroups } from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import { MentionMenuList } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";
import { act, render, screen, waitFor } from "@/test-utils";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { MentionMenuListHandle } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";
import type { ComponentProps } from "react";

const PEOPLE = [
  { userId: "1", displayName: "Priya Natarajan", email: "priya.n@example.org" },
  { userId: "2", displayName: "Priscilla Owusu", email: "p.owusu@example.org" },
];

const DASHBOARD: GadgetSearchResult = {
  ref: {
    gadgetType: "dashboard",
    gadgetId: "11111111-1111-4111-8111-111111111111",
    subId: null,
  },
  label: "Measles by borough",
  subLabel: undefined,
  hasLimitedAudience: false,
};

const DATASET: GadgetSearchResult = {
  ref: {
    gadgetType: "dataset",
    gadgetId: "22222222-2222-4222-8222-222222222222",
    subId: null,
  },
  label: "Borough boundaries",
  subLabel: undefined,
  hasLimitedAudience: false,
};

const LIMITED_HINT =
  'Only some people can open this dashboard. Teammates on this case without access will see "Unavailable".';

function _rect(): DOMRect {
  return new DOMRect(10, 10, 0, 16);
}

type ListProps = ComponentProps<typeof MentionMenuList>;

function _renderList(
  options: Partial<ListProps> & {
    gadgets?: readonly GadgetSearchResult[];
    people?: typeof PEOPLE;
  } = {},
) {
  const { gadgets = [], people = PEOPLE, ...props } = options;
  return render(
    <MentionMenuList
      groups={buildMentionMenuGroups({ gadgets, people })}
      isSearching={false}
      searchFailed={false}
      clientRect={_rect}
      command={vi.fn()}
      {...props}
    />,
  );
}

function _pressKey(
  ref: React.RefObject<MentionMenuListHandle | null>,
  init: KeyboardEventInit,
): boolean {
  let isHandled = false;
  act(() => {
    isHandled =
      ref.current?.onKeyDown(new KeyboardEvent("keydown", init)) ?? false;
  });
  return isHandled;
}

/** Matches the one element whose whole text is `text`, across child tags. */
function _hasWholeText(text: string) {
  return (_content: string, element: Element | null): boolean => {
    return element?.textContent === text;
  };
}

function _createEditingArea(): HTMLElement {
  const editingArea = document.createElement("div");
  editingArea.setAttribute("role", "textbox");
  return editingArea;
}

describe("MentionMenuList people", () => {
  it("lists matching members with their email", async () => {
    _renderList();
    expect(await screen.findByText("Priya Natarajan")).toBeInTheDocument();
    expect(screen.getByText("p.owusu@example.org")).toBeInTheDocument();
  });

  it("mentions the highlighted member on Enter after moving down", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, command });
    await screen.findByText("Priya Natarajan");
    _pressKey(ref, { key: "ArrowDown" });
    _pressKey(ref, { key: "Enter" });
    await waitFor(() => {
      expect(command).toHaveBeenCalledWith({
        kind: "person",
        candidate: PEOPLE[1],
      });
    });
  });

  it("says so when nothing matches", async () => {
    _renderList({ people: [] });
    expect(await screen.findByText("No matches")).toBeInTheDocument();
  });

  it("keeps arrow keys away from the editor when nothing matches", async () => {
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, people: [] });
    await screen.findByText("No matches");
    expect(_pressKey(ref, { key: "ArrowDown" })).toBe(true);
    expect(_pressKey(ref, { key: "ArrowUp" })).toBe(true);
    expect(_pressKey(ref, { key: "Enter" })).toBe(false);
  });

  it("lets Shift+Enter on a member fall through to the editor", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, command });
    await screen.findByText("Priya Natarajan");
    expect(_pressKey(ref, { key: "Enter", shiftKey: true })).toBe(false);
    expect(command).not.toHaveBeenCalled();
  });
});

describe("MentionMenuList gadgets", () => {
  it("titles each group and shows each row's detail line", async () => {
    _renderList({ gadgets: [DASHBOARD, DATASET] });
    expect(await screen.findByText("Dashboards")).toBeInTheDocument();
    expect(screen.getByText("Datasets")).toBeInTheDocument();
    expect(screen.getByText("People")).toBeInTheDocument();
    expect(screen.getByText("Measles by borough")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Dataset")).toBeInTheDocument();
    expect(screen.getByText("priya.n@example.org")).toBeInTheDocument();
  });

  it("moves the highlight across groups with the arrow keys", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, command, gadgets: [DASHBOARD, DATASET] });
    await screen.findByText("Measles by borough");
    _pressKey(ref, { key: "ArrowDown" });
    _pressKey(ref, { key: "ArrowDown" });
    _pressKey(ref, { key: "Enter" });
    expect(command).toHaveBeenCalledWith({
      kind: "person",
      candidate: PEOPLE[0],
    });
  });

  it("links the highlighted gadget on Enter", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, command, gadgets: [DASHBOARD] });
    await screen.findByText("Measles by borough");
    expect(_pressKey(ref, { key: "Enter" })).toBe(true);
    expect(command).toHaveBeenCalledWith({
      kind: "gadget",
      display: "link",
      result: DASHBOARD,
    });
  });

  it("embeds the highlighted gadget on Shift+Enter", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, command, gadgets: [DASHBOARD] });
    await screen.findByText("Measles by borough");
    expect(_pressKey(ref, { key: "Enter", shiftKey: true })).toBe(true);
    expect(command).toHaveBeenCalledWith({
      kind: "gadget",
      display: "embed",
      result: DASHBOARD,
    });
  });

  it("lets Ctrl+Enter and Meta+Enter fall through so the editor submits", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, command, gadgets: [DASHBOARD] });
    await screen.findByText("Measles by borough");
    expect(_pressKey(ref, { key: "Enter", ctrlKey: true })).toBe(false);
    expect(_pressKey(ref, { key: "Enter", metaKey: true })).toBe(false);
    expect(command).not.toHaveBeenCalled();
  });

  it("warns when the highlighted gadget only some people can open", async () => {
    const ref = createRef<MentionMenuListHandle>();
    _renderList({
      ref,
      gadgets: [{ ...DASHBOARD, hasLimitedAudience: true }, DATASET],
    });
    expect(await screen.findByText(LIMITED_HINT)).toBeInTheDocument();
    _pressKey(ref, { key: "ArrowDown" });
    expect(screen.queryByText(LIMITED_HINT)).not.toBeInTheDocument();
  });

  it("shows the link and embed keys only while a gadget is highlighted", async () => {
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, gadgets: [DASHBOARD] });
    expect(
      await screen.findByText(_hasWholeText("Enter link")),
    ).toBeInTheDocument();
    expect(
      screen.getByText(_hasWholeText("Shift Enter embed")),
    ).toBeInTheDocument();
    _pressKey(ref, { key: "ArrowDown" });
    expect(
      screen.queryByText(_hasWholeText("Enter link")),
    ).not.toBeInTheDocument();
  });
});

describe("MentionMenuList search states", () => {
  it("shows one searching row in place of the gadget groups", async () => {
    _renderList({ gadgets: [DASHBOARD], isSearching: true });
    expect(await screen.findByText("Searching...")).toBeInTheDocument();
    expect(screen.queryByText("Dashboards")).not.toBeInTheDocument();
    expect(screen.queryByText("Measles by borough")).not.toBeInTheDocument();
    expect(screen.getByText("Priya Natarajan")).toBeInTheDocument();
  });

  it("says the search failed and still lists people", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, command, searchFailed: true });
    expect(
      await screen.findByText("Couldn't search. Keep typing to retry."),
    ).toBeInTheDocument();
    _pressKey(ref, { key: "Enter" });
    expect(command).toHaveBeenCalledWith({
      kind: "person",
      candidate: PEOPLE[0],
    });
  });

  it("does not claim nothing matches while still searching", async () => {
    _renderList({ people: [], isSearching: true });
    expect(await screen.findByText("Searching...")).toBeInTheDocument();
    expect(screen.queryByText("No matches")).not.toBeInTheDocument();
  });
});

describe("MentionMenuList accessibility", () => {
  it("makes the editing area a combobox pointing at the highlighted option", async () => {
    const editingArea = _createEditingArea();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, editingArea, gadgets: [DASHBOARD] });
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

    _pressKey(ref, { key: "ArrowDown" });
    expect(editingArea).toHaveAttribute(
      "aria-activedescendant",
      secondOption?.id,
    );
    expect(secondOption).toHaveAttribute("aria-selected", "true");
  });

  it("restores the editing area's role and drops the combobox attributes on unmount", async () => {
    const editingArea = _createEditingArea();
    const { unmount } = _renderList({ editingArea });
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
