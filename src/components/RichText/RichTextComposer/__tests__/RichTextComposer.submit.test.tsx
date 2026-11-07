import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import { RichTextComposerTestFixtures } from "./RichTextComposerTestFixtures";

const {
  RichTextComposer,
  DOCUMENT,
  _renderComposer,
  _getEditingArea,
  _getEditor,
  _pressModEnter,
} = RichTextComposerTestFixtures;

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
