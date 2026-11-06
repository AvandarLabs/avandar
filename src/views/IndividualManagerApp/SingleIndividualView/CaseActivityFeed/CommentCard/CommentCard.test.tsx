import { modals } from "@mantine/modals";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommentClient } from "@/clients/comments/CommentClient";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";
import { CommentCard } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentCard/CommentCard";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { User } from "$/models/User/User";
import type { ReactNode } from "react";

function _wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

function _comment(overrides: Partial<Comment.T> = {}): Comment.T {
  return {
    authorUserId: "u1" as User.Id,
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Specimens sent" }],
        },
      ],
    },
    bodySchemaVersion: 1,
    bodyText: "Specimens sent",
    createdAt: "2026-10-27T13:40:00+00:00",
    deletedAt: undefined,
    editedAt: undefined,
    id: "c1" as Comment.Id,
    individualId: "i1" as Comment.T["individualId"],
    updatedAt: "2026-10-27T13:40:00+00:00",
    workspaceId: "w1" as Comment.T["workspaceId"],
    ...overrides,
  };
}

const NAMES: Record<string, string> = { u1: "Luis Romero" };

function _getMemberName(userId: string): string | undefined {
  return NAMES[userId];
}

function _renderOwnComment() {
  return render(
    <CommentCard
      comment={_comment()}
      reactions={[]}
      currentUserId={"u1" as User.Id}
      getMemberName={_getMemberName}
      mentionCandidates={[]}
      isHighlighted={false}
    />,
    { wrapper: _wrapper },
  );
}

/** Opens the comment's actions menu and picks an item by its label. */
async function _pickAction(label: string): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "Comment actions" }));
  fireEvent.click(
    await screen.findByRole("menuitem", { name: label, hidden: true }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CommentCard", () => {
  it("shows a loading placeholder for the author, not a former member, while members load", () => {
    render(
      <CommentCard
        comment={_comment()}
        reactions={[]}
        currentUserId={"u2" as User.Id}
        getMemberName={() => {
          return undefined;
        }}
        isLoadingMembers
        mentionCandidates={[]}
        isHighlighted={false}
      />,
      { wrapper: _wrapper },
    );
    expect(screen.queryByText("Former member")).not.toBeInTheDocument();
    expect(screen.getByText("Loading author")).toBeInTheDocument();
  });

  it("deletes your comment after you confirm and keeps focus on the card", async () => {
    const updateSpy = vi
      .spyOn(CommentClient, "update")
      .mockResolvedValue({} as Comment.T);
    _renderOwnComment();
    let confirmOptions:
      | Parameters<typeof modals.openConfirmModal>[0]
      | undefined;
    vi.spyOn(modals, "openConfirmModal").mockImplementation((options) => {
      confirmOptions = options;
      return "delete-comment";
    });
    await _pickAction("Delete");
    expect(confirmOptions?.title).toBe("Delete comment?");
    expect(updateSpy).not.toHaveBeenCalled();
    act(() => {
      confirmOptions?.onConfirm?.();
    });
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        id: "c1",
        data: { deletedAt: expect.any(String) },
      });
    });
    await waitFor(() => {
      expect(screen.getByRole("article")).toHaveFocus();
    });
  });

  it("saves an edit and closes the editor", async () => {
    const updateSpy = vi
      .spyOn(CommentClient, "update")
      .mockResolvedValue({} as Comment.T);
    _renderOwnComment();
    await _pickAction("Edit");
    fireEvent.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        id: "c1",
        data: expect.objectContaining({ bodyText: "Specimens sent" }),
      });
    });
    await waitFor(() => {
      expect(
        screen.queryByRole("textbox", { name: "Edit comment" }),
      ).not.toBeInTheDocument();
    });
    expect(screen.getByRole("article")).toHaveFocus();
  });

  it("returns focus to the card when an edit is cancelled", async () => {
    _renderOwnComment();
    await _pickAction("Edit");
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByRole("textbox", { name: "Edit comment" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("article")).toHaveFocus();
  });

  it("shows the author, the body, and the reaction row", () => {
    render(
      <CommentCard
        comment={_comment()}
        reactions={[]}
        currentUserId={"u2" as User.Id}
        getMemberName={_getMemberName}
        mentionCandidates={[]}
        isHighlighted={false}
      />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("Luis Romero")).toBeInTheDocument();
    expect(screen.getByText("Specimens sent")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Like" })).toBeInTheDocument();
  });

  it("marks an edited comment", () => {
    render(
      <CommentCard
        comment={_comment({ editedAt: "2026-10-27T14:00:00+00:00" })}
        reactions={[]}
        currentUserId={"u2" as User.Id}
        getMemberName={_getMemberName}
        mentionCandidates={[]}
        isHighlighted={false}
      />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("edited")).toBeInTheDocument();
  });

  it("replaces a deleted comment with a placeholder and no actions", () => {
    render(
      <CommentCard
        comment={_comment({
          body: undefined,
          bodyText: undefined,
          deletedAt: "2026-10-27T15:00:00+00:00",
        })}
        reactions={[]}
        currentUserId={"u1" as User.Id}
        getMemberName={_getMemberName}
        mentionCandidates={[]}
        isHighlighted={false}
      />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("This comment was deleted.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Like" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Comment actions" }),
    ).not.toBeInTheDocument();
  });

  it("offers the actions menu only on your own comment", () => {
    const { rerender } = render(
      <CommentCard
        comment={_comment()}
        reactions={[]}
        currentUserId={"u2" as User.Id}
        getMemberName={_getMemberName}
        mentionCandidates={[]}
        isHighlighted={false}
      />,
      { wrapper: _wrapper },
    );
    expect(
      screen.queryByRole("button", { name: "Comment actions" }),
    ).not.toBeInTheDocument();
    rerender(
      <CommentCard
        comment={_comment()}
        reactions={[]}
        currentUserId={"u1" as User.Id}
        getMemberName={_getMemberName}
        mentionCandidates={[]}
        isHighlighted={false}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Comment actions" }),
    ).toBeInTheDocument();
  });

  it("names a former member as the author when their profile is gone", () => {
    render(
      <CommentCard
        comment={_comment({ authorUserId: undefined })}
        reactions={[]}
        currentUserId={"u2" as User.Id}
        getMemberName={_getMemberName}
        mentionCandidates={[]}
        isHighlighted={false}
      />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("Former member")).toBeInTheDocument();
  });
});
