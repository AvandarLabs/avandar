import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@/test-utils";
import { MentionMenuListTestFixtures } from "./MentionMenuListTestFixtures";
import type { MentionMenuListHandle } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";

const {
  PEOPLE,
  DASHBOARD,
  DATASET,
  _buildList,
  _renderList,
  _pressKey,
  _createEditingArea,
} = MentionMenuListTestFixtures;

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
