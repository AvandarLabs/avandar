/** Behavioral tests for when the chat composer accepts input. */
import { AssistantRuntimeProvider, useLocalRuntime } from "@assistant-ui/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { Composer } from "./Composer";
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

vi.mock("@/components/ChatPanel/OfflineModeControl/OfflineModeControl", () => {
  return {
    OfflineModeControl: () => {
      return null;
    },
  };
});

const DATA_EXPLORER_PLACEHOLDER = "Ask about your data...";
const DASHBOARD_PLACEHOLDER = "Ask me to add a chart to this dashboard...";
const DISABLED_PLACEHOLDER = "Chat is enabled in Data Explorer and Dashboards";

function ComposerWithRuntime(): React.ReactNode {
  const runtime = useLocalRuntime({
    run: async function* run() {
      yield { content: [] };
    },
  });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Composer />
    </AssistantRuntimeProvider>
  );
}

function _renderComposer(options: {
  isAgentEnabled: boolean;
  context: Pick<ChatPageContext.T, "app"> & { dashboardId?: string };
}): HTMLElement {
  isAgentEnabledMock.mockReturnValue(options.isAgentEnabled);
  pageContextMock.mockReturnValue(options.context);
  render(<ComposerWithRuntime />);
  return screen.getByRole("textbox");
}

describe("Composer", () => {
  beforeEach(() => {
    pageContextMock.mockReset();
    isAgentEnabledMock.mockReset();
  });

  describe("with the data agent on", () => {
    it.each(["data-sources", "other"] as const)(
      "enables the composer on the %s app with the neutral placeholder",
      (app) => {
        const input = _renderComposer({
          isAgentEnabled: true,
          context: { app },
        });

        expect(input).toBeEnabled();
        expect(input).toHaveAttribute("placeholder", DATA_EXPLORER_PLACEHOLDER);
      },
    );

    it("keeps the Data Explorer placeholder in the Data Explorer", () => {
      const input = _renderComposer({
        isAgentEnabled: true,
        context: { app: "data-explorer" },
      });

      expect(input).toBeEnabled();
      expect(input).toHaveAttribute("placeholder", DATA_EXPLORER_PLACEHOLDER);
    });

    it("keeps the dashboard placeholder on a dashboard editor", () => {
      const input = _renderComposer({
        isAgentEnabled: true,
        context: { app: "dashboards", dashboardId: "dashboard-1" },
      });

      expect(input).toBeEnabled();
      expect(input).toHaveAttribute("placeholder", DASHBOARD_PLACEHOLDER);
    });

    it("uses the neutral placeholder on the dashboard list", () => {
      const input = _renderComposer({
        isAgentEnabled: true,
        context: { app: "dashboards" },
      });

      expect(input).toBeEnabled();
      expect(input).toHaveAttribute("placeholder", DATA_EXPLORER_PLACEHOLDER);
    });

    it("leaves the case designer composer disabled", () => {
      const input = _renderComposer({
        isAgentEnabled: true,
        context: { app: "case-manager" },
      });

      expect(input).toBeDisabled();
      expect(input).toHaveAttribute("placeholder", DISABLED_PLACEHOLDER);
    });
  });

  describe("with the data agent off", () => {
    it.each(["data-sources", "other", "case-manager"] as const)(
      "disables the composer on the %s app",
      (app) => {
        const input = _renderComposer({
          isAgentEnabled: false,
          context: { app },
        });

        expect(input).toBeDisabled();
        expect(input).toHaveAttribute("placeholder", DISABLED_PLACEHOLDER);
      },
    );

    it("enables the composer in the Data Explorer", () => {
      const input = _renderComposer({
        isAgentEnabled: false,
        context: { app: "data-explorer" },
      });

      expect(input).toBeEnabled();
      expect(input).toHaveAttribute("placeholder", DATA_EXPLORER_PLACEHOLDER);
    });

    it("keeps the dashboard placeholder on every dashboards page", () => {
      const input = _renderComposer({
        isAgentEnabled: false,
        context: { app: "dashboards" },
      });

      expect(input).toBeEnabled();
      expect(input).toHaveAttribute("placeholder", DASHBOARD_PLACEHOLDER);
    });
  });
});
