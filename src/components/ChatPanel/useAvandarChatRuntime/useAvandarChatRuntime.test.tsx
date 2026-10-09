/**
 * Session behavior of the chat runtime as it is mounted in the app: inside the
 * real workspace route component and `WorkspaceLayout` provider tree, with a
 * Data Explorer that runs the SQL the chat applies.
 *
 * Two contracts are covered:
 *
 * - Switching workspaces in-app (client-side navigation that only changes
 *   `$workspaceSlug`, as the navbar switcher does) must not carry workspace
 *   A's explorer state or chat thread into workspace B.
 * - The assistant must not report "results are ready" for SQL whose query
 *   failed or came back empty.
 *
 * What is real: the `/$workspaceSlug` route component and `remountDeps`,
 * `RootLayout`, `WorkspaceLayout`, `WorkspaceLayoutContents` and every state
 * manager it provides, `useAvandarChatRuntime` with its model adapter and
 * `ChatThreadStore`, `ChatViewTranscriptSync`, and `useDataQuery`.
 *
 * Queries run through the app's own `AvaQueryClient`, so its retry and cache
 * policy apply as they do in the app.
 *
 * What is faked: the network (`APIClient.post` for the chat turn,
 * `runStructuredQueryWithMetadata` for query execution), identity hooks, and
 * leaf UI that needs a live backend. `AppShell` is replaced by a shell that
 * mounts the chat runtime the way `ChatPanel` does (always mounted, outside
 * the routed content) without its header and thread UI.
 */
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
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AvaQueryClient } from "@/config/AvaQueryClient";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { WorkspaceRelationsDenied } from "@/clients/qetl/assertWorkspaceRelations/WorkspaceRelationsDenied";
import { Route as WorkspaceRootRoute } from "@/routes/_auth/$workspaceSlug/route";
import { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import { useDataQuery } from "@/views/DataExplorerApp/useDataQuery/useDataQuery";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { User } from "$/models/User/User";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { useLocalRuntime } from "@assistant-ui/react";
import type { RouteComponent } from "@tanstack/react-router";

type ChatRuntime = ReturnType<typeof useLocalRuntime>;
type ExplorerState = ReturnType<typeof DataExplorerStateManager.useState>;
type ExplorerDispatch = ReturnType<typeof DataExplorerStateManager.useDispatch>;

const RESULTS_READY = "I ran the query. Your results are ready.";

const USER_ID = "11111111-1111-4111-8111-111111111111" as User.Id;
const DATASET_A_ID = "a1111111-1111-4111-8111-111111111111" as Dataset.Id;
const DATASET_B_ID = "b2222222-2222-4222-8222-222222222222" as Dataset.Id;
const WORKSPACE_A_QUESTION = "cuantos casos hay por region en alpha";
const WORKSPACE_B_QUESTION = "cuantos casos hay en beta";

function _makeWorkspace(
  id: string,
  slug: string,
): Workspace.WithSubscription {
  return Model.make("Workspace", {
    id: id as Workspace.Id,
    ownerId: USER_ID,
    name: slug,
    slug,
    createdAt: "2026-08-14T00:00:00.000Z",
    updatedAt: "2026-08-14T00:00:00.000Z",
    subscription: undefined,
  });
}

const WORKSPACE_A = _makeWorkspace(
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  "alpha",
);
const WORKSPACE_B = _makeWorkspace(
  "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  "beta",
);

function _sqlForDataset(datasetId: string): string {
  return `SELECT "region", COUNT(*) AS "casos" FROM "${datasetId}" GROUP BY "region"`;
}

/** Live handles the mocked shell and explorer publish for the test body. */
const { harness, apiPostMock, runQueryMock } = vi.hoisted(() => {
  return {
    harness: {} as {
      runtime?: ChatRuntime;
      explorerState?: ExplorerState;
      explorerDispatch?: ExplorerDispatch;
      queryStatus?: "pending" | "success" | "error";
    },
    apiPostMock: vi.fn(),
    runQueryMock: vi.fn(),
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", async () => {
  const { useParams } = await import("@tanstack/react-router");
  return {
    useCurrentWorkspace: () => {
      const { workspaceSlug } = useParams({ strict: false }) as {
        workspaceSlug?: string;
      };
      return workspaceSlug === WORKSPACE_B.slug ? WORKSPACE_B : WORKSPACE_A;
    },
  };
});

vi.mock("@/hooks/users/useCurrentUser", () => {
  return {
    useCurrentUser: () => {
      return { id: USER_ID };
    },
  };
});

vi.mock("@/clients/WorkspaceClient", () => {
  return { WorkspaceClient: {} };
});

vi.mock("@/clients/APIClient", () => {
  return { APIClient: { post: apiPostMock } };
});

vi.mock(
  "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata",
  () => {
    return { runStructuredQueryWithMetadata: runQueryMock };
  },
);

vi.mock("@/lib/analytics/AnalyticsClient", () => {
  return { AnalyticsClient: { logEvent: vi.fn() } };
});

vi.mock("@/components/privacy/privacy-helpers/PendingAcks", () => {
  return {
    PendingAcks: {
      consumeAckForText: async () => {
        return undefined;
      },
      clearAll: vi.fn(),
    },
  };
});

vi.mock("@/views/DataExplorerApp/QueryForm/useSqlToStructuredQuery", () => {
  return {
    useSqlToStructuredQuery: () => {
      return {
        isReady: true,
        parseSql: () => {
          throw new Error("structured mapping is not under test");
        },
      };
    },
  };
});

vi.mock("@/i18n/useLanguagePreference", () => {
  return {
    useWorkspaceLanguage: () => {
      return { locale: "en" };
    },
  };
});

vi.mock("@/i18n/WorkspaceI18nProvider", async () => {
  const { I18nProvider } = await import("@lingui/react");
  const { i18n } = await import("@lingui/core");
  return {
    WorkspaceI18nProvider: ({ children }: { children: React.ReactNode }) => {
      return <I18nProvider i18n={i18n}>{children}</I18nProvider>;
    },
  };
});

vi.mock("@/hooks/permissions/useHasPermission/useHasPermission", () => {
  return {
    useHasPermission: () => {
      return true;
    },
  };
});

vi.mock("@/hooks/permissions/useIsGlobalAdmin/useIsGlobalAdmin", () => {
  return {
    useIsGlobalAdmin: () => {
      return false;
    },
  };
});

vi.mock("@/clients/ontology/ConceptClient", () => {
  return {
    ConceptClient: {
      useGetAll: () => {
        return [[], false, {}];
      },
    },
  };
});

vi.mock(
  "@/components/layouts/RootLayout/useSpotlightActions/useSpotlightActions",
  () => {
    return {
      useSpotlightActions: () => {
        return [];
      },
    };
  },
);

vi.mock(
  "@/components/layouts/RootLayout/useRootWorkspaceChecks/useRootWorkspaceChecks",
  () => {
    return { useRootWorkspaceChecks: vi.fn() };
  },
);

vi.mock("@/components/AppDropzone/AppDropzone", () => {
  return {
    AppDropzone: ({ children }: { children: React.ReactNode }) => {
      return <>{children}</>;
    },
  };
});

vi.mock("@/components/Nux/NuxRoot/NuxRoot", () => {
  return {
    NuxRoot: () => {
      return null;
    },
  };
});

// Mounts the chat runtime where `AppShell` mounts `ChatPanel`: beside the
// routed content, for as long as the shell is mounted.
vi.mock("@/components/AppShell/AppShell", async () => {
  const { AssistantRuntimeProvider } = await import("@assistant-ui/react");
  const { useAvandarChatRuntime } =
    await import("@/components/ChatPanel/useAvandarChatRuntime/useAvandarChatRuntime");
  const { ChatViewTranscriptSync } =
    await import("@/components/ChatPanel/useChatViewTranscript/ChatViewTranscriptSync");

  function ChatPanelStandIn(): React.ReactNode {
    const { runtime } = useAvandarChatRuntime();
    harness.runtime = runtime;
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <ChatViewTranscriptSync />
      </AssistantRuntimeProvider>
    );
  }

  return {
    AppShell: ({ children }: { children: React.ReactNode }) => {
      return (
        <>
          {children}
          <ChatPanelStandIn />
        </>
      );
    },
  };
});

/**
 * Runs the explorer's query and records its outcome the way `DataExplorerApp`
 * does (`useDataQuery` plus its `syncLastQueryError` and
 * `syncVizFromQueryResult` effects), so the chat sees the same explorer state
 * it sees in the app.
 */
function DataExplorerStandIn(): React.ReactNode {
  const state = DataExplorerStateManager.useState();
  const dispatch = DataExplorerStateManager.useDispatch();
  const workspace = useCurrentWorkspace();
  const [queryResults, isLoadingResults, dataQuery] = useDataQuery({
    query: state.query,
    rawSql: state.rawSql,
    isStructuredQueryInSync: state.isStructuredQueryInSync,
    auth: "workspace",
    workspaceId: workspace.id,
    analyticsSurface: "data_explorer",
    analyticsTrigger: state.queryTrigger,
  });
  harness.explorerState = state;
  harness.explorerDispatch = dispatch;
  harness.queryStatus = state.rawSql ? dataQuery.status : undefined;

  useEffect(
    function syncLastQueryError() {
      const message = dataQuery.isError ? dataQuery.error.message : undefined;
      if (message !== state.lastQueryError) {
        dispatch.setLastQueryError(message);
      }
    },
    [dataQuery.isError, dataQuery.error, state.lastQueryError, dispatch],
  );

  useEffect(
    function syncVizFromQueryResult() {
      if (!isLoadingResults && queryResults?.columns) {
        dispatch.syncVizFromQueryResult(queryResults.columns);
      }
    },
    [isLoadingResults, queryResults, dispatch],
  );
  return null;
}

function _createTestRouter(initialPath: string) {
  const rootRoute = createRootRoute({ component: Outlet });
  const workspaceRoute = createRoute({
    getParentRoute: () => {
      return rootRoute;
    },
    path: "$workspaceSlug",
    // The production route's own component and remount policy, so a fix in
    // either one is what this test observes.
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

type TestRouter = ReturnType<typeof _createTestRouter>;

async function _renderAppAt(initialPath: string): Promise<TestRouter> {
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
async function _switchToWorkspaceB(router: TestRouter): Promise<void> {
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

function _respondWithSql(sql: string): void {
  apiPostMock.mockResolvedValueOnce(
    Model.make("ChatResponse", {
      assistantText: "",
      generatedSql: { prompt: "question", sql },
    }),
  );
}

function _getThreadTexts(): string[] {
  return (harness.runtime?.thread.getState().messages ?? []).flatMap(
    (message) => {
      return message.content.flatMap((part) => {
        return part.type === "text" ? [part.text] : [];
      });
    },
  );
}

function _getLastAssistantText(): string | undefined {
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
async function _sendChatMessage(text: string): Promise<void> {
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
async function _seedWorkspaceASession(): Promise<TestRouter> {
  runQueryMock.mockRejectedValue(new Error(`Binder Error on ${DATASET_A_ID}`));
  const router = await _renderAppAt("/alpha/data-explorer");
  act(() => {
    harness.explorerDispatch!.setOpenDataset({
      datasetId: DATASET_A_ID,
      name: "Casos de colera",
    });
  });
  _respondWithSql(_sqlForDataset(DATASET_A_ID));
  await _sendChatMessage(WORKSPACE_A_QUESTION);
  // The app's query client retries a generic failure once before erroring.
  await waitFor(
    () => {
      expect(harness.explorerState?.lastQueryError).toContain(DATASET_A_ID);
    },
    { timeout: 5000 },
  );
  return router;
}

function _threadStorageKey(workspace: Workspace.T): string {
  return `ava.chat.thread.${workspace.id}.${USER_ID}`;
}

beforeEach(() => {
  window.localStorage.clear();
  AvaQueryClient.clear();
  apiPostMock.mockReset();
  runQueryMock.mockReset();
  for (const key of Object.keys(harness)) {
    delete harness[key as keyof typeof harness];
  }
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAvandarChatRuntime after an in-app workspace switch", () => {
  it("leaves no workspace A dataset in the explorer's SQL, open dataset or error", async () => {
    const router = await _seedWorkspaceASession();
    // Precondition: the explorer really does hold workspace A's state.
    expect(harness.explorerState?.rawSql).toContain(DATASET_A_ID);

    await _switchToWorkspaceB(router);

    expect({
      rawSql: harness.explorerState?.rawSql,
      openDatasetId: harness.explorerState?.openDataset?.datasetId,
      lastQueryError: harness.explorerState?.lastQueryError,
    }).toEqual({
      rawSql: undefined,
      openDatasetId: undefined,
      lastQueryError: undefined,
    });
  });

  it("does not show workspace A's messages in workspace B's chat thread", async () => {
    const router = await _seedWorkspaceASession();
    expect(_getThreadTexts()).toContain(WORKSPACE_A_QUESTION);

    await _switchToWorkspaceB(router);

    expect(_getThreadTexts()).not.toContain(WORKSPACE_A_QUESTION);
  });

  it("sends no workspace A dataset id in workspace B's first chat request", async () => {
    const router = await _seedWorkspaceASession();
    await _switchToWorkspaceB(router);
    apiPostMock.mockClear();
    _respondWithSql(_sqlForDataset(DATASET_B_ID));

    await _sendChatMessage(WORKSPACE_B_QUESTION);

    const request = apiPostMock.mock.calls[0]?.[0];
    expect(request?.pathParams).toEqual({ workspaceId: WORKSPACE_B.id });
    // Covers every channel a raw id reaches the model through: the "Previous
    // SQL" suffix (`context.lastSql`), `context.lastError`,
    // `context.openDatasetId`, and the hidden view-change lines in `messages`.
    expect(JSON.stringify(request?.body)).not.toContain(DATASET_A_ID);
  });

  it("does not persist workspace A's thread under workspace B's storage key", async () => {
    const router = await _seedWorkspaceASession();
    // Precondition: workspace A's thread was persisted under A's key.
    expect(
      window.localStorage.getItem(_threadStorageKey(WORKSPACE_A)),
    ).toContain(WORKSPACE_A_QUESTION);
    await _switchToWorkspaceB(router);
    _respondWithSql(_sqlForDataset(DATASET_B_ID));

    await _sendChatMessage(WORKSPACE_B_QUESTION);

    const workspaceBThread = window.localStorage.getItem(
      _threadStorageKey(WORKSPACE_B),
    );
    expect(workspaceBThread).toContain(WORKSPACE_B_QUESTION);
    expect(workspaceBThread).not.toContain(WORKSPACE_A_QUESTION);
  });
});

describe("useAvandarChatRuntime reply to SQL it applied", () => {
  it("does not say the results are ready when the query is refused", async () => {
    runQueryMock.mockRejectedValue(
      new WorkspaceRelationsDenied({
        workspaceId: WORKSPACE_A.id,
        deniedDatasetIds: [DATASET_B_ID],
      }),
    );
    await _renderAppAt("/alpha/data-explorer");
    _respondWithSql(_sqlForDataset(DATASET_B_ID));

    await _sendChatMessage(WORKSPACE_A_QUESTION);
    await waitFor(() => {
      expect(harness.explorerState?.lastQueryError).toContain(
        "do not belong to it",
      );
    });

    expect(_getLastAssistantText()).not.toBe(RESULTS_READY);
  });

  it("does not say the results are ready when the query returns no rows", async () => {
    runQueryMock.mockResolvedValue({
      result: { id: "empty", columns: [], data: [], numRows: 0 },
      didAutoLimit: false,
    });
    await _renderAppAt("/alpha/data-explorer");
    _respondWithSql(_sqlForDataset(DATASET_A_ID));

    await _sendChatMessage(WORKSPACE_A_QUESTION);
    await waitFor(() => {
      expect(harness.queryStatus).toBe("success");
    });

    expect(_getLastAssistantText()).not.toBe(RESULTS_READY);
  });

  it("says the results are ready when the query returns rows", async () => {
    // Positive control: the copy above is withheld for a reason, not gone.
    runQueryMock.mockResolvedValue({
      result: {
        id: "rows",
        columns: [{ name: "region", dataType: "text" }],
        data: [{ region: "norte" }],
        numRows: 1,
      },
      didAutoLimit: false,
    });
    await _renderAppAt("/alpha/data-explorer");
    _respondWithSql(_sqlForDataset(DATASET_A_ID));

    await _sendChatMessage(WORKSPACE_A_QUESTION);
    await waitFor(() => {
      expect(harness.queryStatus).toBe("success");
    });

    expect(_getLastAssistantText()).toBe(RESULTS_READY);
  });
});
