import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CommentReactionClient } from "@/clients/comments/CommentReactionClient";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import { CommentReactions } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CommentReactions/CommentReactions";
import { buildCaseActivityFeedQueryKey } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useCaseActivityFeed";
import type { Comment } from "$/models/comments/Comment/Comment";
import type { CommentReaction } from "$/models/comments/CommentReaction/CommentReaction";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { ActivityFeedEntry } from "@/clients/activity/ActivityEventClient";
import type { CaseActivityFeedData } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/useCaseActivityFeed";
import type { ReactNode } from "react";

const COMMENT = {
  id: "c1",
  individualId: "i1",
  workspaceId: "w1",
} as Comment.T;

const MY_LIKE = {
  commentId: "c1",
  id: "r1",
  kind: "like",
  userId: "u1",
} as CommentReaction.T;

const FEED_QUERY_KEY = [
  ...buildCaseActivityFeedQueryKey("i1" as Individual.Id),
  ["comment_created"],
];

function _createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function _createQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function _renderReactions(
  reactions: readonly CommentReaction.T[],
  queryClient = _createQueryClient(),
) {
  return render(
    <CommentReactions
      comment={COMMENT}
      reactions={reactions}
      currentUserId={"u1" as CommentReaction.T["userId"]}
      getMemberName={() => {
        return "Dana";
      }}
    />,
    { wrapper: _createWrapper(queryClient) },
  );
}

function _getCachedReactions(
  queryClient: QueryClient,
): readonly CommentReaction.T[] | undefined {
  return queryClient.getQueryData<CaseActivityFeedData>(FEED_QUERY_KEY)
    ?.pages[0]?.entries[0]?.reactions;
}

/**
 * The open reaction picker. Mantine hides a popover whose target has no
 * layout, which is every element in jsdom, so its contents are queried with
 * `hidden: true` the way `pickMantineSelectOption` does.
 */
function _findPicker(): Promise<HTMLElement> {
  return screen.findByRole("group", { name: "Reactions", hidden: true });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CommentReactions", () => {
  it("posts a Like with one click", async () => {
    const insertSpy = vi
      .spyOn(CommentReactionClient, "insert")
      .mockResolvedValue({} as CommentReaction.T);
    _renderReactions([]);
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
    _renderReactions([{ ...MY_LIKE, kind: "celebrate" }]);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("1 reaction")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Celebrate" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("removes your reaction when you click it again", async () => {
    const deleteSpy = vi
      .spyOn(CommentReactionClient, "delete")
      .mockResolvedValue(undefined);
    _renderReactions([MY_LIKE]);
    fireEvent.click(screen.getByRole("button", { name: "Like" }));
    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith({ id: "r1" });
    });
  });

  it("focuses your current reaction when the picker opens from the keyboard", async () => {
    _renderReactions([{ ...MY_LIKE, kind: "support" }]);
    fireEvent.keyDown(screen.getByRole("button", { name: "Support" }), {
      key: "ArrowDown",
    });
    const picker = await _findPicker();
    await waitFor(() => {
      expect(
        within(picker).getByRole("button", { name: "Support", hidden: true }),
      ).toHaveFocus();
    });
  });

  it("swaps your reaction from the picker", async () => {
    const insertSpy = vi
      .spyOn(CommentReactionClient, "insert")
      .mockResolvedValue({} as CommentReaction.T);
    _renderReactions([MY_LIKE]);
    fireEvent.keyDown(screen.getByRole("button", { name: "Like" }), {
      key: "ArrowDown",
    });
    const picker = await _findPicker();
    fireEvent.click(
      within(picker).getByRole("button", { name: "Celebrate", hidden: true }),
    );
    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ kind: "celebrate", userId: "u1" }),
        }),
      );
    });
  });

  it("shows your reaction at once and rolls it back when saving fails", async () => {
    const queryClient = _createQueryClient();
    queryClient.setQueryData<CaseActivityFeedData>(FEED_QUERY_KEY, {
      pageParams: [undefined],
      pages: [
        {
          hasMore: false,
          entries: [
            {
              comment: COMMENT as Comment.T | undefined,
              reactions: [] as CommentReaction.T[],
            } as ActivityFeedEntry,
          ],
        },
      ],
    });
    let rejectInsert: (error: Error) => void = () => {};
    vi.spyOn(CommentReactionClient, "insert").mockImplementation(() => {
      return new Promise((_resolve, reject) => {
        rejectInsert = reject;
      });
    });
    _renderReactions([], queryClient);
    fireEvent.click(screen.getByRole("button", { name: "Like" }));
    await waitFor(() => {
      expect(_getCachedReactions(queryClient)).toEqual([
        expect.objectContaining({ kind: "like", userId: "u1" }),
      ]);
    });
    rejectInsert(new Error("offline"));
    await waitFor(() => {
      expect(_getCachedReactions(queryClient)).toEqual([]);
    });
  });
});
