/** Mounting the chat session index on a page outside any workspace. */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatSessionProvider } from "./ChatSessionProvider";
import { useChatSessions } from "./useChatSessions";
import type { ReactNode } from "react";

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: "user-1" };
    },
  };
});

function SessionConsumer(): ReactNode {
  const sessions = useChatSessions();
  return (
    <div data-testid="session-state">{sessions ? "loaded" : "pending"}</div>
  );
}

function _renderAtRootPage(): void {
  const rootRoute = createRootRoute({
    component: () => {
      return (
        <ChatSessionProvider>
          <SessionConsumer />
        </ChatSessionProvider>
      );
    },
  });
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("ChatSessionProvider outside a workspace", () => {
  it("renders without a workspace route and supplies no sessions", async () => {
    _renderAtRootPage();

    expect(await screen.findByTestId("session-state")).toHaveTextContent(
      "pending",
    );
  });
});
