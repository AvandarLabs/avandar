import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { buildMentionMenuGroups } from "@/components/RichText/MentionMenu/buildMentionMenuGroups/buildMentionMenuGroups";
import { MentionMenuList } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";
import { act, render, screen, waitFor, within } from "@/test-utils";
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

type ListOptions = Partial<ListProps> & {
  gadgets?: readonly GadgetSearchResult[];
  people?: typeof PEOPLE;
};

function _buildList(options: ListOptions = {}) {
  const { gadgets = [], people = PEOPLE, ...props } = options;
  return (
    <MentionMenuList
      groups={buildMentionMenuGroups({ gadgets, people })}
      isSearching={false}
      searchFailed={false}
      clientRect={_rect}
      command={vi.fn()}
      {...props}
    />
  );
}

function _renderList(options: ListOptions = {}) {
  return render(_buildList(options));
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

  it("mentions the highlighted member on Tab", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, command });
    await screen.findByText("Priya Natarajan");
    expect(_pressKey(ref, { key: "Tab" })).toBe(true);
    expect(command).toHaveBeenCalledWith({
      kind: "person",
      candidate: PEOPLE[0],
    });
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

  it("lets Ctrl, Meta, and Alt with Enter fall through to the editor", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, command, gadgets: [DASHBOARD] });
    await screen.findByText("Measles by borough");
    expect(_pressKey(ref, { key: "Enter", ctrlKey: true })).toBe(false);
    expect(_pressKey(ref, { key: "Enter", metaKey: true })).toBe(false);
    expect(_pressKey(ref, { key: "Enter", altKey: true })).toBe(false);
    expect(command).not.toHaveBeenCalled();
  });

  it("links the highlighted gadget on Tab", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, command, gadgets: [DASHBOARD] });
    await screen.findByText("Measles by borough");
    expect(_pressKey(ref, { key: "Tab" })).toBe(true);
    expect(command).toHaveBeenCalledWith({
      kind: "gadget",
      display: "link",
      result: DASHBOARD,
    });
  });

  it("puts each row under its type's title, in menu order", async () => {
    const gadgetOfType = (
      gadgetType: GadgetSearchResult["ref"]["gadgetType"],
      label: string,
    ): GadgetSearchResult => {
      return { ...DATASET, ref: { ...DATASET.ref, gadgetType }, label };
    };
    _renderList({
      gadgets: [
        gadgetOfType("individual", "Amara Okafor"),
        gadgetOfType("concept", "Measles case"),
        gadgetOfType("map", "Exposure sites"),
      ],
    });
    const orderedTexts = [
      "Maps",
      "Exposure sites",
      "Case types",
      "Measles case",
      "Cases",
      "Amara Okafor",
      "People",
      "Priya Natarajan",
    ].map((text) => {
      return screen.getByText(text);
    });
    orderedTexts.slice(1).forEach((element, index) => {
      expect(
        orderedTexts[index]!.compareDocumentPosition(element) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });
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
  it("shows a searching row above the people while no gadgets are shown yet", async () => {
    _renderList({ isSearching: true });
    expect(await screen.findByText("Searching…")).toBeInTheDocument();
    expect(screen.getByText("Priya Natarajan")).toBeInTheDocument();
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-busy", "true");
  });

  it("keeps the last gadgets on screen with a quiet indicator while searching again", async () => {
    _renderList({ gadgets: [DASHBOARD], isSearching: true });
    expect(await screen.findByText("Measles by borough")).toBeInTheDocument();
    expect(screen.getByText("Dashboards")).toBeInTheDocument();
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
    expect(screen.getByTestId("mention-menu-refreshing")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Updating results");
    expect(screen.getByRole("listbox")).toHaveAttribute("aria-busy", "true");
  });

  it("announces the search status outside the listbox", async () => {
    _renderList({ isSearching: true });
    await screen.findByText("Searching…");
    const listbox = screen.getByRole("listbox");
    expect(screen.getByRole("status")).toHaveTextContent("Searching…");
    expect(within(listbox).queryByRole("status")).not.toBeInTheDocument();
  });

  it("is not busy and shows no indicator once the search settles", async () => {
    _renderList({ gadgets: [DASHBOARD] });
    await screen.findByText("Measles by borough");
    expect(screen.getByRole("listbox")).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(
      screen.queryByTestId("mention-menu-refreshing"),
    ).not.toBeInTheDocument();
  });

  it("says the search failed, hides gadgets, and still lists people", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref, command, gadgets: [DASHBOARD], searchFailed: true });
    expect(
      await screen.findByText("Couldn't search. Keep typing to retry."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Measles by borough")).not.toBeInTheDocument();
    _pressKey(ref, { key: "Enter" });
    expect(command).toHaveBeenCalledWith({
      kind: "person",
      candidate: PEOPLE[0],
    });
  });

  it("does not claim nothing matches while still searching", async () => {
    _renderList({ people: [], isSearching: true });
    expect(await screen.findByText("Searching…")).toBeInTheDocument();
    expect(screen.queryByText("No matches")).not.toBeInTheDocument();
  });
});

describe("MentionMenuList highlight", () => {
  it("keeps a highlighted member highlighted when gadgets arrive above", async () => {
    const editingArea = _createEditingArea();
    const ref = createRef<MentionMenuListHandle>();
    const { rerender } = _renderList({ ref, editingArea });
    await screen.findByText("Priya Natarajan");
    _pressKey(ref, { key: "ArrowDown" });
    const priscillaOptionId = screen.getAllByRole("option")[1]?.id;
    rerender(_buildList({ ref, editingArea, gadgets: [DASHBOARD] }));
    await screen.findByText("Measles by borough");
    expect(editingArea).toHaveAttribute(
      "aria-activedescendant",
      priscillaOptionId,
    );
  });

  it("keeps the first member chosen by Enter when gadgets arrive above before any key", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    const { rerender } = _renderList({ ref, command });
    await screen.findByText("Priya Natarajan");
    rerender(_buildList({ ref, command, gadgets: [DASHBOARD, DATASET] }));
    await screen.findByText("Measles by borough");
    _pressKey(ref, { key: "Enter" });
    expect(command).toHaveBeenCalledWith({
      kind: "person",
      candidate: PEOPLE[0],
    });
  });

  it("falls back to the first row when the highlighted row goes away", async () => {
    const editingArea = _createEditingArea();
    const ref = createRef<MentionMenuListHandle>();
    const { rerender } = _renderList({ ref, editingArea });
    await screen.findByText("Priya Natarajan");
    _pressKey(ref, { key: "ArrowDown" });
    rerender(
      _buildList({
        ref,
        editingArea,
        gadgets: [DASHBOARD],
        people: [PEOPLE[0]!],
      }),
    );
    await screen.findByText("Measles by borough");
    const [firstOption] = screen.getAllByRole("option");
    expect(editingArea).toHaveAttribute(
      "aria-activedescendant",
      firstOption?.id,
    );
  });

  it("moves on from the kept row with the arrow keys", async () => {
    const command = vi.fn();
    const ref = createRef<MentionMenuListHandle>();
    const { rerender } = _renderList({ ref, command });
    await screen.findByText("Priya Natarajan");
    _pressKey(ref, { key: "ArrowDown" });
    rerender(_buildList({ ref, command, gadgets: [DASHBOARD] }));
    await screen.findByText("Measles by borough");
    _pressKey(ref, { key: "ArrowDown" });
    _pressKey(ref, { key: "Enter" });
    // Priscilla was the last row, so the highlight wraps to the dashboard.
    expect(command).toHaveBeenCalledWith({
      kind: "gadget",
      display: "link",
      result: DASHBOARD,
    });
  });
});

describe("MentionMenuList scrolling", () => {
  it("scrolls the highlighted row into view when the arrow keys move to it", async () => {
    const scrollIntoView = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    const ref = createRef<MentionMenuListHandle>();
    _renderList({ ref });
    await screen.findByText("Priya Natarajan");
    scrollIntoView.mockClear();
    _pressKey(ref, { key: "ArrowDown" });
    const priscillaOption = screen.getAllByRole("option")[1];
    await waitFor(() => {
      expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
    });
    expect(scrollIntoView.mock.contexts).toContain(priscillaOption);
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
