import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { ActivityEventClient } from "@/clients/activity/ActivityEventClient";
import { render, screen } from "@/test-utils";
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

describe("CaseActivityFeed", () => {
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
  });
});
