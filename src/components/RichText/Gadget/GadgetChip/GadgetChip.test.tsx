import { beforeEach, describe, expect, it, vi } from "vitest";
import { GadgetChip } from "@/components/RichText/Gadget/GadgetChip/GadgetChip";
import { render, screen } from "@/test-utils";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { useDashboardSummary: vi.fn() };
});

vi.mock(
  "@/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries",
  () => {
    const unavailable = () => {
      return { status: "unavailable" };
    };
    return {
      useDashboardSummary: mocks.useDashboardSummary,
      useDashboardTileSummary: unavailable,
      useDatasetSummary: unavailable,
      useMapSummary: unavailable,
      useConceptSummary: unavailable,
      useIndividualSummary: unavailable,
    };
  },
);

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
      search: _search,
      ...rest
    }: {
      children: ReactNode;
      to: string;
      params?: unknown;
      search?: unknown;
    }) => {
      return createElement("a", { href: to, ...rest }, children);
    },
  };
});

const DASHBOARD_REF: Gadget.Ref = {
  gadgetType: "dashboard",
  gadgetId: "11111111-1111-4111-8111-111111111111",
  subId: null,
};

beforeEach(() => {
  mocks.useDashboardSummary.mockReset();
});

describe("GadgetChip", () => {
  it("labels the loading skeleton with the gadget's noun", () => {
    mocks.useDashboardSummary.mockReturnValue({ status: "loading" });
    render(<GadgetChip gadgetRef={DASHBOARD_REF} />);
    expect(
      screen.getByText("Loading dashboard").closest("[aria-busy]"),
    ).not.toBeNull();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("links to an available gadget by name with its type's icon", () => {
    mocks.useDashboardSummary.mockReturnValue({
      status: "available",
      name: "Measles by borough",
      facts: [],
      link: {
        to: "/$workspaceSlug/dashboards/preview/$dashboardId",
        params: {
          workspaceSlug: "nyc-doh",
          dashboardId: DASHBOARD_REF.gadgetId,
        },
      },
    });
    render(<GadgetChip gadgetRef={DASHBOARD_REF} />);
    const link = screen.getByRole("link", { name: "Measles by borough" });
    expect(link).toHaveAttribute(
      "href",
      "/$workspaceSlug/dashboards/preview/$dashboardId",
    );
    expect(link.querySelector(".tabler-icon-layout-dashboard")).not.toBeNull();
  });

  it("shows an unavailable gadget as locked text without a link", () => {
    mocks.useDashboardSummary.mockReturnValue({ status: "unavailable" });
    render(<GadgetChip gadgetRef={DASHBOARD_REF} />);
    const chip = screen.getByText("Unavailable dashboard");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(
      chip.closest("[data-type]")?.querySelector(".tabler-icon-lock"),
    ).not.toBeNull();
  });

  it("carries the ref as data attributes for the editor to parse", () => {
    mocks.useDashboardSummary.mockReturnValue({ status: "unavailable" });
    render(<GadgetChip gadgetRef={DASHBOARD_REF} />);
    const chip = screen
      .getByText("Unavailable dashboard")
      .closest("[data-type]");
    expect(chip).toHaveAttribute("data-type", "gadgetLink");
    expect(chip).toHaveAttribute("data-gadget-type", "dashboard");
    expect(chip).toHaveAttribute("data-gadget-id", DASHBOARD_REF.gadgetId);
  });
});
