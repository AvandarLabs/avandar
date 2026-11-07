import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GadgetChip,
  UnknownGadgetChip,
} from "@/components/RichText/Gadget/GadgetChip/GadgetChip";
import { render, screen } from "@/test-utils";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { useDashboardSummary: vi.fn(), useDashboardTileSummary: vi.fn() };
});

vi.mock(
  "@/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries",
  () => {
    const unavailable = () => {
      return { status: "unavailable" };
    };
    return {
      useDashboardSummary: mocks.useDashboardSummary,
      useDashboardTileSummary: mocks.useDashboardTileSummary,
      useDatasetSummary: unavailable,
      useMapSummary: unavailable,
      useConceptSummary: unavailable,
      useIndividualSummary: unavailable,
    };
  },
);

// Renders the link target into `href`, so a test can assert params and
// search without a router.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual =
    await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      params = {},
      search,
      ...rest
    }: {
      children: ReactNode;
      to: string;
      params?: Record<string, string>;
      search?: Record<string, string>;
    }) => {
      const path = Object.entries(params).reduce((href, [name, value]) => {
        return href.replace(`$${name}`, value);
      }, to);
      const query = search ? `?${new URLSearchParams(search).toString()}` : "";
      return createElement("a", { href: `${path}${query}`, ...rest }, children);
    },
  };
});

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";

const DASHBOARD_REF: Gadget.Ref = {
  gadgetType: "dashboard",
  gadgetId: DASHBOARD_ID,
  subId: null,
};

const TILE_REF: Gadget.Ref = {
  gadgetType: "dashboard_tile",
  gadgetId: DASHBOARD_ID,
  subId: "DataViz-top",
};

beforeEach(() => {
  mocks.useDashboardSummary.mockReset();
  mocks.useDashboardTileSummary.mockReset();
});

describe("GadgetChip", () => {
  it("labels the loading skeleton with the gadget's type", () => {
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
        params: { workspaceSlug: "nyc-doh", dashboardId: DASHBOARD_ID },
      },
    });
    render(<GadgetChip gadgetRef={DASHBOARD_REF} />);
    const link = screen.getByRole("link", { name: "Measles by borough" });
    expect(link).toHaveAttribute(
      "href",
      `/nyc-doh/dashboards/preview/${DASHBOARD_ID}`,
    );
    expect(link.querySelector(".tabler-icon-layout-dashboard")).not.toBeNull();
  });

  it("links a tile chip to its tile on the dashboard", () => {
    mocks.useDashboardTileSummary.mockReturnValue({
      status: "available",
      name: "Weekly cases",
      facts: [],
      link: {
        to: "/$workspaceSlug/dashboards/preview/$dashboardId",
        params: { workspaceSlug: "nyc-doh", dashboardId: DASHBOARD_ID },
        search: { tile: "DataViz-top" },
      },
    });
    render(<GadgetChip gadgetRef={TILE_REF} />);
    expect(screen.getByRole("link", { name: "Weekly cases" })).toHaveAttribute(
      "href",
      `/nyc-doh/dashboards/preview/${DASHBOARD_ID}?tile=DataViz-top`,
    );
  });

  it("asks for a summary without facts", () => {
    mocks.useDashboardSummary.mockReturnValue({ status: "loading" });
    render(<GadgetChip gadgetRef={DASHBOARD_REF} />);
    expect(mocks.useDashboardSummary).toHaveBeenCalledWith(DASHBOARD_REF, {
      withFacts: false,
    });
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
    mocks.useDashboardTileSummary.mockReturnValue({ status: "unavailable" });
    render(<GadgetChip gadgetRef={TILE_REF} />);
    const chip = screen
      .getByText("Unavailable dashboard tile")
      .closest("[data-type]");
    expect(chip).toHaveAttribute("data-type", "gadgetLink");
    expect(chip).toHaveAttribute("data-gadget-type", "dashboard_tile");
    expect(chip).toHaveAttribute("data-gadget-id", DASHBOARD_ID);
    expect(chip).toHaveAttribute("data-sub-id", "DataViz-top");
  });

  it("draws an unlinked chip as a button that never navigates", () => {
    mocks.useDashboardSummary.mockReturnValue({
      status: "available",
      name: "Measles by borough",
      facts: [],
      link: {
        to: "/$workspaceSlug/dashboards/preview/$dashboardId",
        params: { workspaceSlug: "nyc-doh", dashboardId: DASHBOARD_ID },
      },
    });
    render(<GadgetChip gadgetRef={DASHBOARD_REF} isLinked={false} />);
    const chip = screen.getByRole("button", { name: "Measles by borough" });
    expect(chip).toHaveAttribute("type", "button");
    expect(chip).toHaveAttribute("data-gadget-id", DASHBOARD_ID);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("keeps an unlinked chip a button while the gadget is unavailable", () => {
    mocks.useDashboardTileSummary.mockReturnValue({ status: "unavailable" });
    render(<GadgetChip gadgetRef={TILE_REF} isLinked={false} />);
    expect(
      screen.getByRole("button", { name: "Unavailable dashboard tile" }),
    ).toHaveAttribute("data-sub-id", "DataViz-top");
  });
});

describe("UnknownGadgetChip", () => {
  it("shows a node with a malformed ref as an unavailable gadget", () => {
    render(<UnknownGadgetChip />);
    expect(screen.getByText("Unavailable gadget")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
