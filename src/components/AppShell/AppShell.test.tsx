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

vi.mock(
  "@/components/OfflineChatDownloadIndicator/OfflineChatDownloadIndicator",
  () => {
    return {
      OfflineChatDownloadIndicator: () => {
        return null;
      },
    };
  },
);

describe("AppShell", () => {
  it("renders without a Nux.Provider when there is no current workspace", () => {
    render(
      <AppShell navbarLinks={[]} showChatPanel={false}>
        <p>workspace-less shell</p>
      </AppShell>,
    );

    expect(screen.getByText("workspace-less shell")).toBeInTheDocument();
  });
});
