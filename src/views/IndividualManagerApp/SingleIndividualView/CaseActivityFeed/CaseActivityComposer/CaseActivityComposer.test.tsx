import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { CaseActivityComposer } from "@/views/IndividualManagerApp/SingleIndividualView/CaseActivityFeed/CaseActivityComposer/CaseActivityComposer";
import type { Individual } from "$/models/ontology/Individual/Individual";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { ReactNode } from "react";

const isOnline = vi.hoisted(() => {
  return { value: true };
});

vi.mock("@/lib/hooks/browser/useIsOnline/useIsOnline", () => {
  return {
    useIsOnline: () => {
      return isOnline.value;
    },
  };
});

function _wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      {children}
    </QueryClientProvider>
  );
}

afterEach(() => {
  isOnline.value = true;
  window.localStorage.clear();
});

describe("CaseActivityComposer", () => {
  it("restores the draft saved for this case", () => {
    window.localStorage.setItem(
      "ava:case-activity-draft:w1:i1",
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Unsent contact list" }],
          },
        ],
      }),
    );
    render(
      <CaseActivityComposer
        workspaceId={"w1" as Workspace.Id}
        individualId={"i1" as Individual.Id}
        mentionCandidates={[]}
      />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText("Unsent contact list")).toBeInTheDocument();
  });

  it("explains that the draft is kept and blocks posting while offline", () => {
    isOnline.value = false;
    window.localStorage.setItem(
      "ava:case-activity-draft:w1:i1",
      JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Offline note" }],
          },
        ],
      }),
    );
    render(
      <CaseActivityComposer
        workspaceId={"w1" as Workspace.Id}
        individualId={"i1" as Individual.Id}
        mentionCandidates={[]}
      />,
      { wrapper: _wrapper },
    );
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
  });
});
