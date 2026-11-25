import { describe, expect, it, vi } from "vitest";
import { RICH_TEXT_MAX_TEXT_LENGTH } from "$/models/RichTextDocument/RichTextDocument";
import { act, fireEvent, screen, waitFor } from "@/test-utils";
import { RichTextComposerTestFixtures } from "./RichTextComposerTestFixtures";

const {
  PRIYA_ID,
  PRISCILLA_ID,
  _renderComposer,
  _getEditingArea,
  _getEditor,
  _pressModEnter,
  _paragraphDocument,
} = RichTextComposerTestFixtures;

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
