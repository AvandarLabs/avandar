import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { fireEvent, render, screen, waitFor } from "@/test-utils";
import { CaseActivityFeed } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityFeed";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "u1" };
    },
  };
});

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

function _commentEntry(id: string, text: string, occurredAt: string) {
  return {
    actorUserId: "u1",
    commentId: `c-${id}`,
    id,
    individualId: "i1",
    kind: "comment_created",
    occurredAt,
    payload: {},
    payloadVersion: 1,
    recordedAt: occurredAt,
    source: "avandar",
    workspaceId: "w1",
    reactions: [],
    comment: {
      authorUserId: "u1",
      body: {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "text", text }] }],
      },
      bodySchemaVersion: 1,
      bodyText: text,
      createdAt: occurredAt,
      deletedAt: undefined,
      editedAt: undefined,
      id: `c-${id}`,
      individualId: "i1",
      updatedAt: occurredAt,
      workspaceId: "w1",
    },
  } as never;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("CaseActivityFeed", () => {
  it("keeps the loaded comments and offers a retry when earlier activity fails", async () => {
    const pageSpy = vi
      .spyOn(ActivityEventClient, "getCaseActivityPage")
      .mockImplementation(async ({ before }) => {
        if (before !== undefined) {
          throw new Error("offline");
        }
        return {
          hasMore: true,
          entries: [
            _commentEntry("e1", "Specimens sent", "2026-10-27T13:40:00"),
          ],
        };
      });
    render(
      <CaseActivityFeed
        workspaceId={"w1" as Workspace.Id}
        individualId={"i1" as Individual.Id}
        members={[]}
        highlightedCommentId={undefined}
      />,
      { wrapper: _wrapper },
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Show earlier activity" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(screen.getByText("Specimens sent")).toBeInTheDocument();
    expect(
      screen.getByText("Earlier activity failed to load."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("The activity for this case failed to load"),
    ).not.toBeInTheDocument();
    expect(pageSpy).toHaveBeenCalledTimes(3);
  });

  it("scrolls a linked comment into view", async () => {
    vi.spyOn(ActivityEventClient, "getCaseActivityPage").mockResolvedValue({
      hasMore: false,
      entries: [
        _commentEntry("e1", "Specimens sent", "2026-10-27T13:40:00"),
        _commentEntry("e2", "Results back", "2026-10-28T09:00:00"),
      ],
    });
    const scrollSpy = vi.spyOn(HTMLElement.prototype, "scrollIntoView");
    render(
      <CaseActivityFeed
        workspaceId={"w1" as Workspace.Id}
        individualId={"i1" as Individual.Id}
        members={[]}
        highlightedCommentId="c-e1"
      />,
      { wrapper: _wrapper },
    );
    await screen.findByText("Specimens sent");
    await waitFor(() => {
      expect(scrollSpy).toHaveBeenCalledTimes(1);
    });
    expect(scrollSpy.mock.contexts[0]).toHaveProperty("id", "comment-c-e1");
  });

  it("loads the feed again when you retry a failed first load", async () => {
    vi.spyOn(ActivityEventClient, "getCaseActivityPage")
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({
        hasMore: false,
        entries: [_commentEntry("e1", "Specimens sent", "2026-10-27T13:40:00")],
      });
    render(
      <CaseActivityFeed
        workspaceId={"w1" as Workspace.Id}
        individualId={"i1" as Individual.Id}
        members={[]}
        highlightedCommentId={undefined}
      />,
      { wrapper: _wrapper },
    );
    fireEvent.click(await screen.findByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Specimens sent")).toBeInTheDocument();
  });

  it("explains a failed first load", async () => {
    vi.spyOn(ActivityEventClient, "getCaseActivityPage").mockRejectedValue(
      new Error("offline"),
    );
    render(
      <CaseActivityFeed
        workspaceId={"w1" as Workspace.Id}
        individualId={"i1" as Individual.Id}
        members={[]}
        highlightedCommentId={undefined}
      />,
      { wrapper: _wrapper },
    );
    expect(
      await screen.findByText("The activity for this case failed to load"),
    ).toBeInTheDocument();
  });

  it("teaches the next move when the case has no activity", async () => {
    vi.spyOn(ActivityEventClient, "getCaseActivityPage").mockResolvedValue({
      entries: [],
      hasMore: false,
    });
    render(
      <CaseActivityFeed
        workspaceId={"w1" as Workspace.Id}
        individualId={"i1" as Individual.Id}
        members={[]}
        highlightedCommentId={undefined}
      />,
      { wrapper: _wrapper },
    );
    expect(
      await screen.findByText("No activity on this case yet"),
    ).toBeInTheDocument();
  });

  it("shows comments under a day separator", async () => {
    vi.spyOn(ActivityEventClient, "getCaseActivityPage").mockResolvedValue({
      hasMore: false,
      entries: [
        {
          actorUserId: "u1",
          commentId: "c1",
          id: "e1",
          individualId: "i1",
          kind: "comment_created",
          occurredAt: "2026-10-27T13:40:00",
          payload: {},
          payloadVersion: 1,
          recordedAt: "2026-10-27T13:40:00",
          source: "avandar",
          workspaceId: "w1",
          reactions: [],
          comment: {
            authorUserId: "u1",
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
            createdAt: "2026-10-27T13:40:00",
            deletedAt: undefined,
            editedAt: undefined,
            id: "c1",
            individualId: "i1",
            updatedAt: "2026-10-27T13:40:00",
            workspaceId: "w1",
          },
        },
      ] as never,
    });
    render(
      <CaseActivityFeed
        workspaceId={"w1" as Workspace.Id}
        individualId={"i1" as Individual.Id}
        members={[]}
        highlightedCommentId={undefined}
      />,
      { wrapper: _wrapper },
    );
    expect(await screen.findByText("Specimens sent")).toBeInTheDocument();
    expect(screen.getByText(/October 27/)).toBeInTheDocument();
    expect(screen.getByRole("feed", { name: "Activity" })).toBeInTheDocument();
  });
});
