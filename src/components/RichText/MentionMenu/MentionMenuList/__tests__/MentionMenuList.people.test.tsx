import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@/test-utils";
import { MentionMenuListTestFixtures } from "./MentionMenuListTestFixtures";
import type { MentionMenuListHandle } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";

const { PEOPLE, _renderList, _pressKey } = MentionMenuListTestFixtures;

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
