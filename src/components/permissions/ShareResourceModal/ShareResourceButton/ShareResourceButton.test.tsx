import { modals } from "@mantine/modals";
import { describe, expect, it, vi } from "vitest";

import { ShareResourceButton } from "@/components/permissions/ShareResourceModal/ShareResourceButton/ShareResourceButton";
import { act, fireEvent, render, screen, waitFor } from "@/test-utils";

vi.mock("@/hooks/permissions/useResourceRole/useResourceRole", () => {
  return {
    useResourceRole: () => {
      return ["admin", false] as const;
    },
  };
});

vi.mock(
  "@/components/permissions/ShareResourceModal/ShareResourceModal",
  () => {
    return {
      ShareResourceModal: () => {
        return null;
      },
    };
  },
);

vi.mock("@mantine/modals", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@mantine/modals")>();
  return {
    ...actual,
    modals: {
      ...actual.modals,
      open: vi.fn(),
      closeAll: vi.fn(),
    },
  };
});

describe("ShareResourceButton", () => {
  it("renders Share when user has admin on resource", () => {
    render(
      <ShareResourceButton
        resourceName="My dashboard"
        resourceType="dashboard"
        resourceId="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
      />,
    );

    expect(screen.getByRole("button", { name: "Share" })).toBeInTheDocument();
  });

  it("opens the modal titled with the resource name", () => {
    render(
      <ShareResourceButton
        resourceName="First dash"
        resourceType="dashboard"
        resourceId="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(modals.open).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Share “First dash”" }),
    );
  });

  it.each([
    { resourceType: "dashboard" as const, tooltip: "Share this dashboard" },
    { resourceType: "dataset" as const, tooltip: "Share this dataset" },
  ])(
    "shows $tooltip tooltip for $resourceType",
    async ({ resourceType, tooltip }) => {
      render(
        <ShareResourceButton
          resourceName="Example"
          resourceType={resourceType}
          resourceId="aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        />,
      );

      const shareButton = screen.getByRole("button", { name: "Share" });
      act(() => {
        shareButton.focus();
      });

      await waitFor(() => {
        expect(screen.getByRole("tooltip")).toHaveTextContent(tooltip);
      });
    },
  );
});
