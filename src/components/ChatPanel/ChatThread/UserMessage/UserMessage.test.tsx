import type { ReactNode } from "react";

/** Behavioral tests for user transcript message visibility. */
import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { render } from "@/test-utils";

import { UserMessage } from "./UserMessage";

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
      Parts: () => {
        return <span>Message content</span>;
      },
    },
  };
});

describe("UserMessage", () => {
  beforeEach(() => {
    messageState.metadata = { custom: {} };
  });

  it("omits an internal discovery continuation", () => {
    messageState.metadata = {
      custom: { isDiscoveryContinuation: true },
    };

    render(<UserMessage />);

    expect(screen.queryByTestId("message-root")).not.toBeInTheDocument();
  });

  it("omits an internal view-change message", () => {
    messageState.metadata = {
      custom: { isViewChange: true },
    };

    render(<UserMessage />);

    expect(screen.queryByTestId("message-root")).not.toBeInTheDocument();
  });

  it("renders an ordinary transcript message", () => {
    render(<UserMessage />);

    expect(screen.getByTestId("message-root")).toBeVisible();
  });
});
