import { describe, expect, it, vi } from "vitest";
import { RichTextComposer } from "@/components/RichText/RichTextComposer/RichTextComposer";
import { fireEvent, render, screen, waitFor } from "@/test-utils";

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
