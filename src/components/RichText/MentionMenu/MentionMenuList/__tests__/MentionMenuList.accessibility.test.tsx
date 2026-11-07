import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { screen } from "@/test-utils";
import { MentionMenuListTestFixtures } from "./MentionMenuListTestFixtures";
import type { MentionMenuListHandle } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";

const { DASHBOARD, _renderList, _pressKey, _createEditingArea } =
  MentionMenuListTestFixtures;

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
