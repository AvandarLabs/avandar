import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { render, screen } from "@/test-utils";
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

describe("CommentCard", () => {
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
