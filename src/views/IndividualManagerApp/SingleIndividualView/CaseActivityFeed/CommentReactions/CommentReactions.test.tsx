import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { CommentReactionClient } from "@/clients/comments/CommentReactionClient";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { CommentReactions } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { ReactNode } from "react";

function _wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      {children}
    </QueryClientProvider>
  );
}

const COMMENT = {
  id: "c1",
  workspaceId: "w1",
} as Comment.T;

describe("CommentReactions", () => {
  it("posts a Like with one click", async () => {
    const insertSpy = vi
      .spyOn(CommentReactionClient, "insert")
      .mockResolvedValue({} as CommentReaction.T);
    render(
      <CommentReactions
        comment={COMMENT}
        reactions={[]}
        currentUserId={"u1" as CommentReaction.T["userId"]}
        getMemberName={() => {
          return "Dana";
        }}
      />,
      { wrapper: _wrapper },
    );
    fireEvent.click(screen.getByRole("button", { name: "Like" }));
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            commentId: "c1",
            kind: "like",
            userId: "u1",
          }),
          upsert: true,
        }),
      );
    });
  });

  it("shows the total and your current reaction", () => {
    render(
      <CommentReactions
        comment={COMMENT}
        reactions={[
          {
            commentId: "c1",
            id: "r1",
            kind: "celebrate",
            userId: "u1",
          } as CommentReaction.T,
        ]}
        currentUserId={"u1" as CommentReaction.T["userId"]}
        getMemberName={() => {
          return "Dana";
        }}
      />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Celebrate" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
