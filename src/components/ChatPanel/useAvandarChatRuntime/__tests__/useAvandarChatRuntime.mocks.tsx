/**
 * Module mocks for the `useAvandarChatRuntime` session tests, which mount the
 * chat runtime as it runs in the app: inside the real workspace route
 * component and `WorkspaceLayout` provider tree, with a Data Explorer that
 * runs the SQL the chat applies. Import this module first so the mocks are
 * registered before anything they replace is loaded.
 *
 * What is real: the `/$workspaceSlug` route component and `remountDeps`,
 * `RootLayout`, `WorkspaceLayout`, `WorkspaceLayoutContents` and every state
 * manager it provides, `useAvandarChatRuntime` with its model adapter and
 * `ChatThreadStore`, `ChatViewTranscriptSync`, and `useDataQuery`. Queries run
 * through the app's own `AvaQueryClient`, so its retry and cache policy apply
 * as they do in the app.
 *
 * What is faked: the network (`APIClient.post` for the chat turn,
 * `runStructuredQueryWithMetadata` for query execution), identity hooks, and
 * leaf UI that needs a live backend. `AppShell` is replaced by a shell that
 * mounts the chat runtime the way `ChatPanel` does (always mounted, outside
 * the routed content) without its header and thread UI.
 */
import { vi } from "vitest";
import type { DataExplorerStateManager } from "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager";
import type { useLocalRuntime } from "@assistant-ui/react";

type ChatRuntime = ReturnType<typeof useLocalRuntime>;
type ExplorerState = ReturnType<typeof DataExplorerStateManager.useState>;
type ExplorerDispatch = ReturnType<typeof DataExplorerStateManager.useDispatch>;

// Live handles the mocked shell and the explorer stand-in publish for the
// test body, plus the network fakes each test programs.
const { hoistedHarness, hoistedApiPostMock, hoistedRunQueryMock } = vi.hoisted(
  () => {
    return {
      hoistedHarness: {} as {
        runtime?: ChatRuntime;
        explorerState?: ExplorerState;
        explorerDispatch?: ExplorerDispatch;
        queryStatus?: "pending" | "success" | "error";
      },
      hoistedApiPostMock: vi.fn(),
      hoistedRunQueryMock: vi.fn(),
    };
  },
);

/**
 * What the mounted app exposes to the test: the chat runtime, the explorer's
 * state and dispatch, and the status of the explorer's current query.
 */
export const harness = hoistedHarness;

/** Stands in for `APIClient.post`, which carries the chat turn. */
export const apiPostMock = hoistedApiPostMock;

/** Stands in for `runStructuredQueryWithMetadata`, which runs explorer SQL. */
export const runQueryMock = hoistedRunQueryMock;

vi.mock("@/hooks/workspaces/useCurrentWorkspace", async () => {
  const { useParams } = await import("@tanstack/react-router");
  const { WORKSPACE_A, WORKSPACE_B } =
    await import("@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.fixtures");
  return {
    useCurrentWorkspace: () => {
      const { workspaceSlug } = useParams({ strict: false }) as {
        workspaceSlug?: string;
      };
      return workspaceSlug === WORKSPACE_B.slug ? WORKSPACE_B : WORKSPACE_A;
    },
  };
});

vi.mock("@/hooks/users/useCurrentUser", async () => {
  const { USER_ID } =
    await import("@/components/ChatPanel/useAvandarChatRuntime/__tests__/useAvandarChatRuntime.fixtures");
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
  return { APIClient: { post: hoistedApiPostMock } };
});

vi.mock(
  "@/clients/queries/runStructuredQuery/runStructuredQueryWithMetadata",
  () => {
    return { runStructuredQueryWithMetadata: hoistedRunQueryMock };
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
    hoistedHarness.runtime = runtime;
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
