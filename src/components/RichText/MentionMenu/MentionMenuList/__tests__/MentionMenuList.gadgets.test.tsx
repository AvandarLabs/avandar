import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@/test-utils";
import { MentionMenuListTestFixtures } from "./MentionMenuListTestFixtures";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { MentionMenuListHandle } from "@/components/RichText/MentionMenu/MentionMenuList/MentionMenuList";

const {
  PEOPLE,
  DASHBOARD,
  DATASET,
  LIMITED_HINT,
  _renderList,
  _pressKey,
  _hasWholeText,
} = MentionMenuListTestFixtures;

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
