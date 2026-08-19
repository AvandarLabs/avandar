/** Behavioral tests for assistant transcript message visibility. */
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils";
import { AssistantMessage } from "./AssistantMessage";
import type { ReactNode } from "react";

const { messageState } = vi.hoisted(() => {
  return {
    messageState: {
      metadata: { custom: {} } as {
        custom: Record<string, unknown>;
      },
    },
  };
});

vi.mock("@assistant-ui/react", () => {
  return {
    useMessage: <Selected,>(
      selector: (message: typeof messageState) => Selected,
    ): Selected => {
      return selector(messageState);
    },
    MessagePrimitive: {
      Root: ({ children }: { children: ReactNode }) => {
        return <div data-testid="message-root">{children}</div>;
      },
      If: ({ children }: { children: ReactNode }) => {
        return <>{children}</>;
      },
      Parts: () => {
        return <span>Message content</span>;
      },
    },
    ActionBarPrimitive: {
      Root: ({ children }: { children: ReactNode }) => {
        return <div>{children}</div>;
      },
      Reload: ({ children }: { children: ReactNode }) => {
        return <button type="button">{children}</button>;
      },
    },
  };
});

describe("AssistantMessage", () => {
  beforeEach(() => {
    messageState.metadata = { custom: {} };
  });

  it("omits an internal discovery continuation", () => {
    messageState.metadata = {
      custom: { isDiscoveryContinuation: true },
    };

    render(<AssistantMessage />);

    expect(screen.queryByTestId("message-root")).not.toBeInTheDocument();
  });

  it("omits an internal view-change message", () => {
    messageState.metadata = {
      custom: { isViewChange: true },
    };

    render(<AssistantMessage />);

    expect(screen.queryByTestId("message-root")).not.toBeInTheDocument();
  });

  it("renders an ordinary transcript message", () => {
    render(<AssistantMessage />);

    expect(screen.getByTestId("message-root")).toBeVisible();
  });
});
