import type { ReactNode } from "react";

import { describe, expect, it, vi } from "vitest";

import { render, screen } from "@/test-utils";

import { DashboardAccessDeniedView } from "./DashboardAccessDeniedView";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({ children, to }: { children: ReactNode; to: string }) => {
      return createElement("a", { href: to }, children);
    },
  };
});

describe("DashboardAccessDeniedView", () => {
  it("uses the shared access-denied copy without an account-switch action", () => {
    render(<DashboardAccessDeniedView />);

    expect(
      screen.getByRole("heading", { name: "You need access" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Ask the dashboard's owner to share it with you."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Sign in with a different account" }),
    ).not.toBeInTheDocument();
  });

  it("offers an account-switch link when the route permits it", () => {
    render(<DashboardAccessDeniedView canSwitchAccount />);

    expect(
      screen.getByRole("link", { name: "Sign in with a different account" }),
    ).toHaveAttribute("href", "/signin");
  });
});
