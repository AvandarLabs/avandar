import { Model } from "@avandar/models";
import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { act, render, waitFor } from "@testing-library/react";
import { expect } from "vitest";
import { DataExplorerStandIn } from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/DataExplorerStandIn";
import {
  DATASET_A_ID,
  makeSqlFromDatasetId,
  USER_ID,
  WORKSPACE_A_QUESTION,
  WORKSPACE_B,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.fixtures";
import {
  apiPostMock,
  harness,
  runQueryMock,
} from "@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.mocks";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { Route as WorkspaceRootRoute } from "@/routes/_auth/$workspaceSlug/route";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { RouteComponent } from "@tanstack/react-router";

function _createTestRouter(initialPath: string) {
  const rootRoute = createRootRoute({ component: Outlet });
  const workspaceRoute = createRoute({
    getParentRoute: () => {
      return rootRoute;
    },
    path: "$workspaceSlug",
    // The production route's own component and remount policy, so a fix in
    // either one is what this test observes. Both options are typed for the
    // production route's place in the app's route tree, which this test tree
    // does not reproduce, so neither can be proven assignable here.
    component: WorkspaceRootRoute.options.component as RouteComponent,
    remountDeps: WorkspaceRootRoute.options.remountDeps as never,
  });
  const homeRoute = createRoute({
    getParentRoute: () => {
      return workspaceRoute;
    },
    path: "/",
    component: () => {
      return null;
    },
  });
  const explorerRoute = createRoute({
    getParentRoute: () => {
      return workspaceRoute;
    },
    path: "data-explorer",
    component: DataExplorerStandIn,
  });
  return createRouter({
    routeTree: rootRoute.addChildren([
      workspaceRoute.addChildren([homeRoute, explorerRoute]),
    ]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });
}

/** The router the app is mounted under. */
export type TestRouter = ReturnType<typeof _createTestRouter>;

/** Mounts the app at `initialPath` and waits for the chat and explorer. */
export async function renderAppAt(initialPath: string): Promise<TestRouter> {
  const router = _createTestRouter(initialPath);
  render(
    <MantineProvider>
      <QueryClientProvider client={AvaQueryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </MantineProvider>,
  );
  await waitFor(() => {
    expect(harness.runtime).toBeDefined();
    expect(harness.explorerDispatch).toBeDefined();
  });
  return router;
}

/** Switches workspace like the navbar switcher, then opens the Explorer. */
export async function switchToWorkspaceB(router: TestRouter): Promise<void> {
  // `navigate` is typed against the app's registered router, whose route tree
  // this test router does not share, so its options are cast.
  await act(async () => {
    await router.navigate({
      to: "/$workspaceSlug",
      params: { workspaceSlug: WORKSPACE_B.slug },
    } as never);
  });
  await act(async () => {
    await router.navigate({
      to: "/$workspaceSlug/data-explorer",
      params: { workspaceSlug: WORKSPACE_B.slug },
    } as never);
  });
  await waitFor(() => {
    expect(router.state.location.pathname).toBe("/beta/data-explorer");
  });
}

/** Makes the next chat turn answer with `sql` and no other prose. */
export function respondWithSql(sql: string): void {
  apiPostMock.mockResolvedValueOnce(
    Model.make("ChatResponse", {
      assistantText: "",
      generatedSql: { prompt: "question", sql },
    }),
  );
}

/** Every text part in the chat thread, hidden view-change lines included. */
export function getThreadTexts(): string[] {
  return (harness.runtime?.thread.getState().messages ?? []).flatMap(
    (message) => {
      return message.content.flatMap((part) => {
        return part.type === "text" ? [part.text] : [];
      });
    },
  );
}

/** The text of the most recent assistant message. */
export function getLastAssistantText(): string | undefined {
  const messages = harness.runtime?.thread.getState().messages ?? [];
  const lastAssistant = [...messages].reverse().find((message) => {
    return message.role === "assistant";
  });
  return lastAssistant?.content
    .flatMap((part) => {
      return part.type === "text" ? [part.text] : [];
    })
    .join("");
}

/** Sends one user message and waits for the assistant's reply to land. */
export async function sendChatMessage(text: string): Promise<void> {
  const runtime = harness.runtime;
  if (!runtime) {
    throw new Error("chat runtime is not mounted");
  }
  const assistantCountBefore = runtime.thread
    .getState()
    .messages.filter((message) => {
      return message.role === "assistant";
    }).length;
  await act(async () => {
    runtime.thread.append({
      role: "user",
      content: [{ type: "text", text }],
    });
  });
  // Generous because a reply may wait on the query, and the app's query
  // client retries a generic failure once before erroring.
  await waitFor(
    () => {
      const state = harness.runtime!.thread.getState();
      const assistantCount = state.messages.filter((message) => {
        return message.role === "assistant";
      }).length;
      expect(state.isRunning).toBe(false);
      expect(assistantCount).toBeGreaterThan(assistantCountBefore);
    },
    { timeout: 5000 },
  );
}

/**
 * Builds a workspace A session: dataset A open in the explorer, one chat turn
 * whose SQL reads dataset A, and that query's failure recorded as the
 * explorer's last error.
 */
export async function seedWorkspaceASession(): Promise<TestRouter> {
  runQueryMock.mockRejectedValue(new Error(`Binder Error on ${DATASET_A_ID}`));
  const router = await renderAppAt("/alpha/data-explorer");
  act(() => {
    harness.explorerDispatch!.setOpenDataset({
      datasetId: DATASET_A_ID,
      name: "Casos de colera",
    });
  });
  respondWithSql(makeSqlFromDatasetId(DATASET_A_ID));
  await sendChatMessage(WORKSPACE_A_QUESTION);
  // The app's query client retries a generic failure once before erroring.
  await waitFor(
    () => {
      expect(harness.explorerState?.lastQueryError).toContain(DATASET_A_ID);
    },
    { timeout: 5000 },
  );
  return router;
}

/** The localStorage key the chat thread for `workspace` persists under. */
export function makeThreadStorageKeyFromWorkspace(
  workspace: Workspace.T,
): string {
  return `ava.chat.thread.${workspace.id}.${USER_ID}`;
}

/** Clears every piece of state a previous test left behind. */
export function resetHarness(): void {
  window.localStorage.clear();
  AvaQueryClient.clear();
  apiPostMock.mockReset();
  runQueryMock.mockReset();
  Object.keys(harness).forEach((key) => {
    delete harness[key as keyof typeof harness];
  });
}
