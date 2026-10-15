import { describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/AppShell/AppShell";
import { render, screen } from "@/test-utils";

vi.mock("@/components/AppShell/Navbar/Navbar", () => {
  return {
    Navbar: () => {
      return <nav data-testid="navbar" />;
    },
  };
});

vi.mock("@/components/JobProgressPanel/JobProgressPanel", () => {
  return {
    JobProgressPanel: () => {
      return null;
    },
  };
});

describe("AppShell", () => {
  it("renders its children without crashing when there is no current workspace", () => {
    render(
      <AppShell navbarLinks={[]} showChatPanel={false}>
        <p>workspace-less shell</p>
      </AppShell>,
    );

    expect(screen.getByText("workspace-less shell")).toBeInTheDocument();
  });
});
