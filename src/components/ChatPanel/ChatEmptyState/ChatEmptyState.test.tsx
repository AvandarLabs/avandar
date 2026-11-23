/** Behavioral tests for the copy the chat's empty state shows per page. */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { ChatEmptyState } from "./ChatEmptyState";
import type { ChatPageContext } from "$/models/chat/ChatPageContext/ChatPageContext";

const { pageContextMock, isAgentEnabledMock } = vi.hoisted(() => {
  return {
    pageContextMock: vi.fn(),
    isAgentEnabledMock: vi.fn(),
  };
});

vi.mock("@/components/ChatPanel/useChatPageContext", () => {
  return { useChatPageContext: pageContextMock };
});

vi.mock("@/lib/agent/dataAgent/browser/DataAgentFeature", () => {
  return {
    DataAgentFeature: {
      isEnabled: isAgentEnabledMock,
      storageKey: "avandar:data-agent",
    },
  };
});

vi.mock("@assistant-ui/react", () => {
  return {
    useThreadRuntime: () => {
      return undefined;
    },
  };
});

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => {
      return {};
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "33333333-3333-4333-8333-333333333333", slug: "demo" };
    },
  };
});

vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [[]];
      },
    },
  };
});

vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return {
    DatasetColumnClient: {
      useGetAll: () => {
        return [[]];
      },
    },
  };
});

vi.mock(
  "@/views/DataExplorerApp/DataExplorerStateManager/DataExplorerStateManager",
  () => {
    return {
      DataExplorerStateManager: {
        useState: () => {
          return { openDataset: undefined };
        },
      },
    };
  },
);

vi.mock("@/components/ChatPanel/ChatEmptyState/useChatSuggestions", () => {
  return {
    useChatSuggestions: () => {
      return [];
    },
  };
});

vi.mock("@avandar/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    Link: ({ children }: { children: React.ReactNode }) => {
      return <a href="/data-explorer">{children}</a>;
    },
  };
});

const TODAYS_COPY = /Chat is enabled in the Data Explorer and Dashboards/;

function _renderEmptyState(options: {
  isAgentEnabled: boolean;
  app: ChatPageContext.ChatApp;
}): void {
  isAgentEnabledMock.mockReturnValue(options.isAgentEnabled);
  pageContextMock.mockReturnValue({ app: options.app });
  render(<ChatEmptyState />);
}

describe("ChatEmptyState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("says chat works only in Data Explorer and Dashboards with the agent off", () => {
    _renderEmptyState({ isAgentEnabled: false, app: "other" });

    expect(screen.getByText(TODAYS_COPY)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open Data Explorer" }),
    ).toBeInTheDocument();
  });

  it("invites a question on any page with the agent on", () => {
    _renderEmptyState({ isAgentEnabled: true, app: "other" });

    expect(screen.queryByText(TODAYS_COPY)).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Ask a question about your data. Type @ to point me at a dashboard, dataset, or map.",
      ),
    ).toBeInTheDocument();
  });

  it("invites a question on Data Sources with the agent on", () => {
    _renderEmptyState({ isAgentEnabled: true, app: "data-sources" });

    expect(screen.queryByText(TODAYS_COPY)).not.toBeInTheDocument();
  });
});
