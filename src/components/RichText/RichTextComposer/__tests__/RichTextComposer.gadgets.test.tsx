import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@/test-utils";
import { RichTextComposerTestFixtures } from "./RichTextComposerTestFixtures";

const {
  mocks,
  WORKSPACE_ID,
  MEASLES_DASHBOARD,
  MEXICO_DASHBOARD,
  GADGET_ATTRS_JSON,
  _renderComposer,
  _getEditingArea,
  _getEditor,
  _openGadgetMenu,
  _postAndGetCall,
  _holdGadgetSearches,
  _advanceTime,
  _type,
  _renderTimedComposer,
  _paragraphDocument,
} = RichTextComposerTestFixtures;

describe("RichTextComposer gadget search", () => {
  it("searches the workspace for the typed query and shows searching first", async () => {
    mocks.searchGadgets.mockResolvedValue([MEASLES_DASHBOARD]);
    _renderComposer({ initialContent: undefined, workspaceId: WORKSPACE_ID });
    act(() => {
      _getEditor().commands.insertContent("@meas");
    });
    expect(await screen.findByText("Searching…")).toBeInTheDocument();
    expect(await screen.findByText("Measles by borough")).toBeInTheDocument();
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
    expect(mocks.searchGadgets).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      query: "meas",
      limit: 30,
      signal: expect.any(AbortSignal),
    });
  });

  it("links the gadget on Enter and posts only its type noun as plain text", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    await _openGadgetMenu(onSubmit);
    fireEvent.keyDown(_getEditingArea(), { key: "Enter" });
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
    const [document, plainText] = await _postAndGetCall(onSubmit);
    expect(JSON.stringify(document)).toContain(
      `{"type":"gadgetLink","attrs":${GADGET_ATTRS_JSON}}`,
    );
    expect(plainText).toContain("[dashboard]");
    expect(plainText).not.toContain("Measles by borough");
  });

  it("embeds the gadget on Shift+Enter", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    await _openGadgetMenu(onSubmit);
    fireEvent.keyDown(_getEditingArea(), { key: "Enter", shiftKey: true });
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
    const [document] = await _postAndGetCall(onSubmit);
    expect(JSON.stringify(document)).toContain(
      `{"type":"gadgetEmbed","attrs":${GADGET_ATTRS_JSON}}`,
    );
    expect(JSON.stringify(document)).not.toContain("gadgetLink");
  });

  it("still lists members when the gadget search fails", async () => {
    mocks.searchGadgets.mockRejectedValue(new Error("offline"));
    _renderComposer({ initialContent: undefined, workspaceId: WORKSPACE_ID });
    act(() => {
      _getEditor().commands.insertContent("@pri");
    });
    expect(
      await screen.findByText("Couldn't search. Keep typing to retry."),
    ).toBeInTheDocument();
    expect(screen.getByText("Priya Natarajan")).toBeInTheDocument();
  });

  it("names the @ control for gadgets too when a workspace is given", () => {
    _renderComposer({ workspaceId: WORKSPACE_ID });
    expect(
      screen.getByRole("button", {
        name: "Mention a teammate or link a dashboard, dataset, or case",
      }),
    ).toBeInTheDocument();
  });
});

describe("RichTextComposer gadget search timing", () => {
  it("never searches gadgets without a workspace", async () => {
    _renderTimedComposer({ workspaceId: undefined });
    await _type("@pri");
    expect(screen.getByText("Priya Natarajan")).toBeInTheDocument();
    await _advanceTime(300);
    expect(mocks.searchGadgets).not.toHaveBeenCalled();
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
  });

  it("searches once, for the last query, when typing faster than the pause", async () => {
    _renderTimedComposer();
    await _type("@m");
    await _advanceTime(50);
    await _type("e");
    await _advanceTime(50);
    await _type("a");
    await _advanceTime(150);
    expect(mocks.searchGadgets).toHaveBeenCalledTimes(1);
    expect(mocks.searchGadgets).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: WORKSPACE_ID, query: "mea" }),
    );
  });

  it("keeps the last results shown while the next query is searched", async () => {
    const pendingSearches = _holdGadgetSearches();
    _renderTimedComposer();
    await _type("@meas");
    await _advanceTime(150);
    await act(async () => {
      pendingSearches[0]?.resolve([MEASLES_DASHBOARD]);
    });
    expect(screen.getByText("Measles by borough")).toBeInTheDocument();

    await _type("l");
    await _advanceTime(150);
    expect(pendingSearches).toHaveLength(2);
    expect(screen.getByText("Measles by borough")).toBeInTheDocument();
    expect(screen.getByTestId("mention-menu-refreshing")).toBeInTheDocument();
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
  });

  it("ignores and aborts a search that a later query replaced", async () => {
    const pendingSearches = _holdGadgetSearches();
    _renderTimedComposer();
    await _type("@me");
    await _advanceTime(150);
    await _type("a");
    await _advanceTime(150);
    const [staleSearch, latestSearch] = pendingSearches;
    expect(staleSearch?.params.signal?.aborted).toBe(true);
    await act(async () => {
      latestSearch?.resolve([MEASLES_DASHBOARD]);
    });
    await act(async () => {
      staleSearch?.resolve([MEXICO_DASHBOARD]);
    });
    expect(screen.getByText("Measles by borough")).toBeInTheDocument();
    expect(screen.queryByText("Mexico imports")).not.toBeInTheDocument();
  });

  it("stays closed when a search finishes after Escape", async () => {
    const consoleError = vi.spyOn(console, "error");
    const pendingSearches = _holdGadgetSearches();
    _renderTimedComposer();
    await _type("@meas");
    await _advanceTime(150);
    fireEvent.keyDown(_getEditingArea(), { key: "Escape" });
    await _advanceTime(0);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(pendingSearches[0]?.params.signal?.aborted).toBe(true);
    await act(async () => {
      pendingSearches[0]?.resolve([MEASLES_DASHBOARD]);
    });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.queryByText("Measles by borough")).not.toBeInTheDocument();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});

describe("RichTextComposer gadget insertion", () => {
  it("swallows a space already after the query when linking", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    mocks.searchGadgets.mockResolvedValue([MEASLES_DASHBOARD]);
    _renderComposer({
      onSubmit,
      initialContent: _paragraphDocument("@meas more"),
      workspaceId: WORKSPACE_ID,
    });
    act(() => {
      // Put the caret right after "@meas", before the existing space.
      _getEditor().commands.setTextSelection(6);
    });
    expect(await screen.findByText("Measles by borough")).toBeInTheDocument();
    window.getSelection()?.selectAllChildren(_getEditingArea());
    fireEvent.keyDown(_getEditingArea(), { key: "Enter" });
    await waitFor(() => {
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });
    const [, plainText] = await _postAndGetCall(onSubmit);
    expect(plainText).toBe("[dashboard] more");
  });
});
