import { beforeEach, describe, expect, it, vi } from "vitest";
import { RICH_TEXT_MAX_TEXT_LENGTH } from "$/models/RichTextDocument/RichTextDocument";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import type { RichTextDocument } from "$/models/RichTextDocument/RichTextDocument";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { MentionCandidate } from "@/components/RichText/UserMention/filterMentionCandidates";
import type { Editor } from "@tiptap/core";
import type { ComponentProps } from "react";

const mocks = vi.hoisted(() => {
  return { searchGadgets: vi.fn() };
});

vi.mock("@/clients/gadgets/searchGadgets/searchGadgets", () => {
  return { searchGadgets: mocks.searchGadgets };
});

vi.mock(
  "@/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries",
  () => {
    const unavailable = () => {
      return { status: "unavailable" };
    };
    return {
      useDashboardSummary: unavailable,
      useDashboardTileSummary: unavailable,
      useDatasetSummary: unavailable,
      useMapSummary: unavailable,
      useConceptSummary: unavailable,
      useIndividualSummary: unavailable,
    };
  },
);

beforeEach(() => {
  mocks.searchGadgets.mockReset();
  mocks.searchGadgets.mockResolvedValue([]);
});

const DOCUMENT = {
  type: "doc" as const,
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Lab results are in" }],
    },
  ],
};

describe("RichTextComposer", () => {
  it("disables the submit button while the editor is empty", () => {
    render(
      <RichTextComposer
        label="Write an update"
        placeholder="Write an update"
        mentionCandidates={[]}
        submitLabel="Post"
        isSubmitting={false}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });

  it("submits the document and clears itself when the submit succeeds", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    render(
      <RichTextComposer
        label="Write an update"
        placeholder="Write an update"
        initialContent={DOCUMENT}
        mentionCandidates={[]}
        submitLabel="Post"
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ type: "doc" }),
        "Lab results are in",
      );
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
    });
  });

  it("keeps the text when the submit fails", async () => {
    const onSubmit = vi.fn().mockResolvedValue(false);
    render(
      <RichTextComposer
        label="Write an update"
        placeholder="Write an update"
        initialContent={DOCUMENT}
        mentionCandidates={[]}
        submitLabel="Post"
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    // Let the rejected save settle before checking nothing was cleared.
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(screen.getByText("Lab results are in")).toBeInTheDocument();
  });

  it("disables posting when the caller blocks it", () => {
    render(
      <RichTextComposer
        label="Write an update"
        placeholder="Write an update"
        initialContent={DOCUMENT}
        mentionCandidates={[]}
        submitLabel="Post"
        isSubmitting={false}
        isSubmitBlocked
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });
});

const PRIYA_ID = "11111111-1111-4111-8111-111111111111";
const PRISCILLA_ID = "22222222-2222-4222-8222-222222222222";

const CANDIDATES: MentionCandidate[] = [
  {
    userId: PRIYA_ID,
    displayName: "Priya Natarajan",
    email: "priya.n@example.org",
  },
  {
    userId: PRISCILLA_ID,
    displayName: "Priscilla Owusu",
    email: "p.owusu@example.org",
  },
];

function _renderComposer(
  props: Partial<ComponentProps<typeof RichTextComposer>> = {},
): void {
  render(
    <RichTextComposer
      label="Write an update"
      placeholder="Write an update"
      initialContent={DOCUMENT}
      mentionCandidates={CANDIDATES}
      submitLabel="Post"
      isSubmitting={false}
      onSubmit={vi.fn().mockResolvedValue(true)}
      {...props}
    />,
  );
}

function _getEditingArea(): HTMLElement {
  // Found by name alone: its role is `textbox`, or `combobox` while the
  // mention list is open.
  return screen.getByLabelText("Write an update");
}

function _getEditor(): Editor {
  return (_getEditingArea() as HTMLElement & { editor: Editor }).editor;
}

function _pressModEnter(): void {
  // ProseMirror maps `Mod` to Control outside macOS, which jsdom reports.
  fireEvent.keyDown(_getEditingArea(), { key: "Enter", ctrlKey: true });
}

function _paragraphDocument(text: string): RichTextDocument.T {
  return {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  };
}

describe("RichTextComposer submit lifecycle", () => {
  it("submits on Mod-Enter", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    _renderComposer({ onSubmit });
    _pressModEnter();
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it("submits once when Mod-Enter is pressed twice during a save", async () => {
    const onSubmit = vi.fn().mockReturnValue(new Promise<boolean>(() => {}));
    _renderComposer({ onSubmit });
    _pressModEnter();
    _pressModEnter();
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("locks the text while saving and unlocks it when the save fails", async () => {
    let finishSave: (didSave: boolean) => void = () => {};
    const onSubmit = vi.fn().mockReturnValue(
      new Promise<boolean>((resolve) => {
        finishSave = resolve;
      }),
    );
    _renderComposer({ onSubmit });
    _pressModEnter();
    await waitFor(() => {
      expect(_getEditingArea()).toHaveAttribute("contenteditable", "false");
    });
    await act(async () => {
      finishSave(false);
    });
    expect(_getEditingArea()).toHaveAttribute("contenteditable", "true");
    expect(screen.getByText("Lab results are in")).toBeInTheDocument();
  });

  it("keeps the text when the submit rejects", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("offline"));
    _renderComposer({ onSubmit });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(_getEditingArea()).toHaveAttribute("contenteditable", "true");
    });
    expect(screen.getByText("Lab results are in")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeEnabled();
  });
});

describe("RichTextComposer links", () => {
  it("refuses to submit a link that could run script and says why", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    _renderComposer({
      onSubmit,
      initialContent: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "results",
                marks: [
                  { type: "link", attrs: { href: "javascript:alert(1)" } },
                ],
              },
            ],
          },
        ],
      },
    });
    // The link extension already blanks a disallowed href when it loads
    // content, so force one in the way a buggy paste path could.
    act(() => {
      const editor = _getEditor();
      editor.commands.selectAll();
      editor.commands.setMark("link", { href: "javascript:alert(1)" });
    });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    expect(
      await screen.findByText(
        "Some links in this update are not allowed. Use web or email links.",
      ),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("never submits a javascript link pasted as markdown", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    _renderComposer({ onSubmit, initialContent: undefined });
    fireEvent.paste(_getEditingArea(), {
      clipboardData: {
        types: ["text/plain"],
        getData: (type: string) => {
          return type === "text/plain"
            ? "See [x](javascript:alert(1)) **now**"
            : "";
        },
      },
    });
    fireEvent.click(await screen.findByRole("button", { name: "Post" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(JSON.stringify(onSubmit.mock.calls[0]?.[0])).not.toContain(
      "javascript:",
    );
  });
});

describe("RichTextComposer character limit", () => {
  it("shows the counter once the text reaches the threshold", () => {
    _renderComposer({
      initialContent: _paragraphDocument(
        "a".repeat(RICH_TEXT_MAX_TEXT_LENGTH - 1000),
      ),
    });
    expect(
      screen.getByText(
        `${RICH_TEXT_MAX_TEXT_LENGTH - 1000} of ${RICH_TEXT_MAX_TEXT_LENGTH} characters`,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeEnabled();
  });

  it("counts a mention as the member's name, as the stored text does", async () => {
    _renderComposer({
      initialContent: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              {
                type: "text",
                text: "a".repeat(RICH_TEXT_MAX_TEXT_LENGTH - 1016),
              },
              { type: "userMention", attrs: { id: PRIYA_ID } },
            ],
          },
        ],
      },
    });
    // The chip renders through a React portal after the editor mounts.
    expect(await screen.findByText("@Priya Natarajan")).toBeInTheDocument();
    // "@Priya Natarajan" is 16 characters.
    expect(
      screen.getByText(
        `${RICH_TEXT_MAX_TEXT_LENGTH - 1000} of ${RICH_TEXT_MAX_TEXT_LENGTH} characters`,
      ),
    ).toBeInTheDocument();
  });

  it("disables posting once the text is over the limit", () => {
    _renderComposer({
      initialContent: _paragraphDocument(
        "a".repeat(RICH_TEXT_MAX_TEXT_LENGTH + 1),
      ),
    });
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });
});

describe("RichTextComposer mentions", () => {
  it("inserts the chosen member's id when typing @ and pressing Enter", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    _renderComposer({ onSubmit, initialContent: undefined });
    act(() => {
      _getEditor().commands.insertContent("@pris");
    });
    expect(await screen.findByText("Priscilla Owusu")).toBeInTheDocument();
    // The mention command collapses the DOM selection after inserting, and
    // jsdom throws on that when no range exists, unlike a real browser.
    window.getSelection()?.selectAllChildren(_getEditingArea());
    fireEvent.keyDown(_getEditingArea(), { key: "Enter" });
    await waitFor(() => {
      expect(screen.queryByText("Priscilla Owusu")).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(JSON.stringify(onSubmit.mock.calls[0]?.[0])).toContain(
      `{"type":"userMention","attrs":{"id":"${PRISCILLA_ID}"}}`,
    );
  });

  it("describes the open list to assistive technology on the editing area", async () => {
    _renderComposer({ initialContent: undefined });
    act(() => {
      _getEditor().commands.insertContent("@pri");
    });
    await screen.findByText("Priya Natarajan");
    const editingArea = _getEditingArea();
    const listboxId = screen.getByRole("listbox").id;
    const [firstOption, secondOption] = screen.getAllByRole("option");
    await waitFor(() => {
      expect(editingArea).toHaveAttribute(
        "aria-activedescendant",
        firstOption?.id,
      );
    });
    expect(editingArea).toHaveAttribute("role", "combobox");
    expect(editingArea).toHaveAttribute("aria-expanded", "true");
    expect(editingArea).toHaveAttribute("aria-controls", listboxId);
    expect(editingArea).toHaveAttribute("aria-autocomplete", "list");

    fireEvent.keyDown(editingArea, { key: "ArrowDown" });
    await waitFor(() => {
      expect(editingArea).toHaveAttribute(
        "aria-activedescendant",
        secondOption?.id,
      );
    });

    fireEvent.keyDown(editingArea, { key: "Escape" });
    await waitFor(() => {
      expect(editingArea).not.toHaveAttribute("aria-controls");
    });
    expect(editingArea).not.toHaveAttribute("aria-expanded");
    expect(editingArea).not.toHaveAttribute("aria-activedescendant");
    expect(editingArea).not.toHaveAttribute("aria-autocomplete");
    expect(editingArea).toHaveAttribute("role", "textbox");
  });

  it("submits instead of picking a member on Mod-Enter while the list is open", async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    _renderComposer({ onSubmit, initialContent: undefined });
    act(() => {
      _getEditor().commands.insertContent("Ask @pri");
    });
    await screen.findByText("Priya Natarajan");
    _pressModEnter();
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
    expect(JSON.stringify(onSubmit.mock.calls[0]?.[0])).not.toContain(
      "userMention",
    );
  });
});

describe("RichTextComposer toolbar", () => {
  it("disables every toolbar control while saving", async () => {
    const onSubmit = vi.fn().mockReturnValue(new Promise<boolean>(() => {}));
    _renderComposer({ onSubmit });
    _pressModEnter();
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    [
      "Bold",
      "Italic",
      "Bullet list",
      "Numbered list",
      "Link",
      "Code",
      "Quote",
      "Mention a teammate",
    ].forEach((name) => {
      expect(screen.getByRole("button", { name })).toBeDisabled();
    });
  });
});

describe("RichTextComposer labels", () => {
  it("gives every toolbar control a name", () => {
    _renderComposer();
    [
      "Bold",
      "Italic",
      "Bullet list",
      "Numbered list",
      "Link",
      "Code",
      "Quote",
      "Mention a teammate",
    ].forEach((name) => {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    });
  });
});

const WORKSPACE_ID = "33333333-3333-4333-8333-333333333333";
const DASHBOARD_ID = "44444444-4444-4444-8444-444444444444";

const MEASLES_DASHBOARD: GadgetSearchResult = {
  ref: { gadgetType: "dashboard", gadgetId: DASHBOARD_ID, subId: null },
  label: "Measles by borough",
  subLabel: undefined,
  hasLimitedAudience: false,
};

const GADGET_ATTRS_JSON = `{"gadgetType":"dashboard","gadgetId":"${DASHBOARD_ID}","subId":null}`;

/** Types `@meas` in an empty composer and waits for the dashboard row. */
async function _openGadgetMenu(
  onSubmit: ComponentProps<typeof RichTextComposer>["onSubmit"],
): Promise<void> {
  mocks.searchGadgets.mockResolvedValue([MEASLES_DASHBOARD]);
  _renderComposer({
    onSubmit,
    initialContent: undefined,
    workspaceId: WORKSPACE_ID,
  });
  act(() => {
    _getEditor().commands.insertContent("@meas");
  });
  expect(await screen.findByText("Measles by borough")).toBeInTheDocument();
  // The insert command collapses the DOM selection, and jsdom throws on
  // that when no range exists, unlike a real browser.
  window.getSelection()?.selectAllChildren(_getEditingArea());
}

async function _postAndGetCall(
  onSubmit: ReturnType<typeof vi.fn>,
): Promise<[RichTextDocument.T, string]> {
  fireEvent.click(screen.getByRole("button", { name: "Post" }));
  await waitFor(() => {
    expect(onSubmit).toHaveBeenCalled();
  });
  return onSubmit.mock.calls[0] as [RichTextDocument.T, string];
}

describe("RichTextComposer gadget search", () => {
  it("searches the workspace for the typed query and shows searching first", async () => {
    mocks.searchGadgets.mockResolvedValue([MEASLES_DASHBOARD]);
    _renderComposer({ initialContent: undefined, workspaceId: WORKSPACE_ID });
    act(() => {
      _getEditor().commands.insertContent("@meas");
    });
    expect(await screen.findByText("Searching...")).toBeInTheDocument();
    expect(await screen.findByText("Measles by borough")).toBeInTheDocument();
    expect(screen.queryByText("Searching...")).not.toBeInTheDocument();
    expect(mocks.searchGadgets).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_ID,
      query: "meas",
      limit: 20,
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

  it("never searches gadgets without a workspace", async () => {
    _renderComposer({ initialContent: undefined });
    act(() => {
      _getEditor().commands.insertContent("@pri");
    });
    expect(await screen.findByText("Priya Natarajan")).toBeInTheDocument();
    // Wait out the search pause so a scheduled search would have run.
    await new Promise((resolve) => {
      setTimeout(resolve, 300);
    });
    expect(mocks.searchGadgets).not.toHaveBeenCalled();
    expect(screen.queryByText("Searching...")).not.toBeInTheDocument();
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
