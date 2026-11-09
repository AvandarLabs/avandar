import {
  AssistantRuntimeProvider,
  ThreadPrimitive,
  useLocalRuntime,
} from "@assistant-ui/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { AssistantMessage } from "@/components/ChatPanel/ChatThread/AssistantMessage/AssistantMessage";
import { render, screen, waitFor } from "@/test-utils";
import { UserMessage } from "./UserMessage";
import type { ThreadMessageLike } from "@assistant-ui/react";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { useDatasetSummary: vi.fn() };
});

vi.mock(
  "@/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries",
  () => {
    const unavailable = () => {
      return { status: "unavailable" };
    };
    return {
      useDashboardSummary: unavailable,
      useDashboardTileSummary: unavailable,
      useDatasetSummary: mocks.useDatasetSummary,
      useMapSummary: unavailable,
      useConceptSummary: unavailable,
      useIndividualSummary: unavailable,
    };
  },
);

// Renders the link target into `href`, so the chip renders without a router.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      params: _params,
      ...rest
    }: {
      children: ReactNode;
      to: string;
      params?: Record<string, string>;
    }) => {
      return createElement("a", { href: to, ...rest }, children);
    },
  };
});

const DATASET_REF = {
  gadgetType: "dataset",
  gadgetId: "22222222-2222-4222-8222-222222222222",
  subId: null,
} as const;

const DATASET_TOKEN = ChatMentionToken.buildToken(DATASET_REF);

function Thread(props: { messages: ThreadMessageLike[] }): ReactNode {
  const runtime = useLocalRuntime(
    {
      run: async () => {
        return { content: [] };
      },
    },
    { initialMessages: props.messages },
  );
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div data-testid="thread">
        <ThreadPrimitive.Messages
          components={{ UserMessage, AssistantMessage }}
        />
      </div>
    </AssistantRuntimeProvider>
  );
}

function _renderUserMessage(text: string): HTMLElement {
  render(<Thread messages={[{ role: "user", content: text }]} />);
  return screen.getByTestId("thread");
}

beforeEach(() => {
  mocks.useDatasetSummary.mockReset();
  mocks.useDatasetSummary.mockReturnValue({
    status: "available",
    name: "US deaths",
    facts: [],
    link: { to: "/nyc-doh/datasets/22222222" },
  });
});

describe("UserMessageTextPart", () => {
  it("draws a mention as a chip and the rest as text", async () => {
    const container = _renderUserMessage(`Show ${DATASET_TOKEN} by week`);

    const chip = await screen.findByRole("link", { name: "US deaths" });

    expect(chip).toHaveAttribute("href", "/nyc-doh/datasets/22222222");
    expect(screen.getByText("Show", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("by week", { exact: false })).toBeInTheDocument();
    expect(container.textContent).toBe("Show US deaths by week");
    expect(container.innerHTML).not.toContain("@{");
  });

  it("draws a gadget the user cannot open as unavailable", async () => {
    mocks.useDatasetSummary.mockReturnValue({ status: "unavailable" });
    const container = _renderUserMessage(`Show ${DATASET_TOKEN}`);

    expect(await screen.findByText("Unavailable dataset")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
    expect(container.innerHTML).not.toContain("@{");
  });

  it("keeps line breaks in the text", async () => {
    const container = _renderUserMessage(`one\n${DATASET_TOKEN}\ntwo`);

    await screen.findByRole("link", { name: "US deaths" });

    expect(container.textContent).toBe("one\nUS deaths\ntwo");
  });

  it("leaves text without mentions as it was written", async () => {
    const container = _renderUserMessage("Plain @ text and @{not a token}");

    await waitFor(() => {
      expect(container.textContent).toBe("Plain @ text and @{not a token}");
    });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("leaves assistant messages as they were", async () => {
    render(
      <Thread
        messages={[
          { role: "user", content: "hi" },
          { role: "assistant", content: `See ${DATASET_TOKEN}` },
        ]}
      />,
    );
    const container = screen.getByTestId("thread");

    await waitFor(() => {
      expect(container.textContent).toContain(`See ${DATASET_TOKEN}`);
    });
    expect(screen.queryByRole("link")).toBeNull();
  });
});
