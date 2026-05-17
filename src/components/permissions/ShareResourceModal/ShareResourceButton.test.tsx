import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ShareResourceButton } from "@/components/permissions/ShareResourceModal/ShareResourceButton";
import { render } from "@/utils/testingUtils";

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
});
