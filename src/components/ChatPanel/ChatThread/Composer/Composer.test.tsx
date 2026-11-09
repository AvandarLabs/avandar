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
      return <button type="button">Offline mode</button>;
    },
  };
});

vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "33333333-3333-4333-8333-333333333333" };
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

function _expectEditableEditor(input: HTMLElement): void {
  expect(input).toHaveAccessibleName("Message");
  expect(input).toHaveAttribute("contenteditable", "true");
}

/** The placeholder TipTap draws on the editor's empty paragraph. */
function _readEditorPlaceholder(input: HTMLElement): string | null {
  return (
    input
      .querySelector("[data-placeholder]")
      ?.getAttribute("data-placeholder") ?? null
  );
}

describe("Composer", () => {
  beforeEach(() => {
    pageContextMock.mockReset();
    isAgentEnabledMock.mockReset();
  });

  describe("with the data agent on", () => {
    it.each(["data-sources", "other"] as const)(
      "enables the editor on the %s app with the neutral placeholder",
      (app) => {
        const input = _renderComposer({
          isAgentEnabled: true,
          context: { app },
        });

        _expectEditableEditor(input);
        expect(_readEditorPlaceholder(input)).toBe(DATA_EXPLORER_PLACEHOLDER);
      },
    );

    it("keeps the Data Explorer placeholder in the Data Explorer", () => {
      const input = _renderComposer({
        isAgentEnabled: true,
        context: { app: "data-explorer" },
      });

      _expectEditableEditor(input);
      expect(_readEditorPlaceholder(input)).toBe(DATA_EXPLORER_PLACEHOLDER);
    });

    it("keeps the dashboard placeholder on a dashboard editor", () => {
      const input = _renderComposer({
        isAgentEnabled: true,
        context: { app: "dashboards", dashboardId: "dashboard-1" },
      });

      _expectEditableEditor(input);
      expect(_readEditorPlaceholder(input)).toBe(DASHBOARD_PLACEHOLDER);
    });

    it("uses the neutral placeholder on the dashboard list", () => {
      const input = _renderComposer({
        isAgentEnabled: true,
        context: { app: "dashboards" },
      });

      _expectEditableEditor(input);
      expect(_readEditorPlaceholder(input)).toBe(DATA_EXPLORER_PLACEHOLDER);
    });

    it("follows the page's placeholder without remounting", () => {
      isAgentEnabledMock.mockReturnValue(true);
      pageContextMock.mockReturnValue({
        app: "dashboards",
        dashboardId: "dashboard-1",
      });
      const { rerender } = render(<ComposerWithRuntime />);
      const input = screen.getByRole("textbox", { name: "Message" });
      expect(_readEditorPlaceholder(input)).toBe(DASHBOARD_PLACEHOLDER);

      pageContextMock.mockReturnValue({ app: "dashboards" });
      rerender(<ComposerWithRuntime />);

      expect(screen.getByRole("textbox", { name: "Message" })).toBe(input);
      expect(_readEditorPlaceholder(input)).toBe(DATA_EXPLORER_PLACEHOLDER);
    });

    it("keeps offline mode beside the send button", () => {
      _renderComposer({ isAgentEnabled: true, context: { app: "other" } });

      const sendButton = screen.getByRole("button", { name: "Send message" });
      const offlineControl = screen.getByRole("button", {
        name: "Offline mode",
      });

      expect(sendButton.parentElement).toBe(offlineControl.parentElement);
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
