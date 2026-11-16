import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@/test-utils";
import { MentionMenuListTestFixtures } from "./MentionMenuListTestFixtures";
import type { MentionMenuListHandle } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";

const { PEOPLE, DASHBOARD, _renderList, _pressKey } =
  MentionMenuListTestFixtures;

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
