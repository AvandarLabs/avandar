import { modals } from "@mantine/modals";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/test-utils";
import { DashboardShareButton } from "@/views/DashboardApp/DashboardShareModal/DashboardShareButton";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

vi.mock("@/hooks/permissions/useResourceRole/useResourceRole", () => {
  return {
    useResourceRole: () => {
      return ["admin", false] as const;
    },
  };
});

vi.mock("@/views/DashboardApp/DashboardShareModal/DashboardShareModal", () => {
  return {
    DashboardShareModal: () => {
      return null;
    },
  };
});

vi.mock("@mantine/modals", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/modals")>();
  return {
    ...actual,
    modals: {
      ...actual.modals,
      open: vi.fn(),
      close: vi.fn(),
    },
  };
});

describe("DashboardShareButton", () => {
  it("opens the modal titled with the dashboard name", () => {
    render(
      <DashboardShareButton
        dashboard={{ id: "dash-1", name: "First dash" } as Dashboard.T}
        hasUnsavedChanges={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(modals.open).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Share “First dash”" }),
    );
  });
});
