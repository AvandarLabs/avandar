import { msg } from "@lingui/core/macro";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GadgetCard } from "@/components/RichText/Gadget/GadgetCard/GadgetCard";
import { render, screen, within } from "@/test-utils";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => {
  return { useDashboardSummary: vi.fn(), useDatasetSummary: vi.fn() };
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
      useDatasetSummary: mocks.useDatasetSummary,
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

const DASHBOARD_REF: Gadget.Ref = {
  gadgetType: "dashboard",
  gadgetId: "11111111-1111-4111-8111-111111111111",
  subId: null,
};

const DATASET_REF: Gadget.Ref = {
  gadgetType: "dataset",
  gadgetId: "22222222-2222-4222-8222-222222222222",
  subId: null,
};

const AVAILABLE_DASHBOARD = {
  status: "available",
  name: "Measles by borough",
  facts: [
    { label: msg`Tiles`, value: "6" },
    { label: msg`Audience`, value: "Workspace" },
    { label: msg`Updated`, value: "Oct 28" },
  ],
  link: {
    to: "/$workspaceSlug/dashboards/preview/$dashboardId",
    params: { workspaceSlug: "nyc-doh", dashboardId: DASHBOARD_REF.gadgetId },
  },
};

beforeEach(() => {
  mocks.useDashboardSummary.mockReset();
  mocks.useDatasetSummary.mockReset();
});

describe("GadgetCard", () => {
  it("titles an available card with the gadget's name and type", () => {
    mocks.useDashboardSummary.mockReturnValue(AVAILABLE_DASHBOARD);
    render(<GadgetCard gadgetRef={DASHBOARD_REF} />);
    const card = screen.getByRole("group", { name: "Measles by borough" });
    expect(within(card).getByText("Dashboard")).toBeInTheDocument();
    expect(card.querySelector(".tabler-icon-layout-dashboard")).not.toBeNull();
  });

  it("links an available card's Open action to the gadget", () => {
    mocks.useDashboardSummary.mockReturnValue(AVAILABLE_DASHBOARD);
    render(<GadgetCard gadgetRef={DASHBOARD_REF} />);
    const openLink = screen.getByRole("link", {
      name: "Open Measles by borough",
    });
    expect(openLink).toHaveTextContent("Open");
    expect(openLink).toHaveAttribute(
      "href",
      `/nyc-doh/dashboards/preview/${DASHBOARD_REF.gadgetId}`,
    );
  });

  it("lists every fact of an available gadget with its label", () => {
    mocks.useDashboardSummary.mockReturnValue(AVAILABLE_DASHBOARD);
    render(<GadgetCard gadgetRef={DASHBOARD_REF} />);
    const terms = screen.getAllByRole("term").map((term) => {
      return term.textContent;
    });
    const definitions = screen.getAllByRole("definition").map((definition) => {
      return definition.textContent;
    });
    expect(terms).toEqual(["Tiles", "Audience", "Updated"]);
    expect(definitions).toEqual(["6", "Workspace", "Oct 28"]);
  });

  it("explains an unavailable gadget without naming or linking it", () => {
    mocks.useDatasetSummary.mockReturnValue({ status: "unavailable" });
    render(<GadgetCard gadgetRef={DATASET_REF} />);
    const card = screen.getByRole("group", { name: "Unavailable dataset" });
    expect(
      within(card).getByText(
        "It may have been deleted, or you don't have access. Ask the comment's author to share it.",
      ),
    ).toBeInTheDocument();
    expect(card.querySelector(".tabler-icon-lock")).not.toBeNull();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("shows header and fact skeletons while the gadget loads", () => {
    mocks.useDashboardSummary.mockReturnValue({ status: "loading" });
    const { container } = render(<GadgetCard gadgetRef={DASHBOARD_REF} />);
    const card = screen.getByRole("group", { name: "Loading dashboard" });
    expect(card).toHaveAttribute("aria-busy", "true");
    expect(container.querySelectorAll(".mantine-Skeleton-root")).toHaveLength(
      4,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("asks for a summary with facts", () => {
    mocks.useDashboardSummary.mockReturnValue({ status: "loading" });
    render(<GadgetCard gadgetRef={DASHBOARD_REF} />);
    expect(mocks.useDashboardSummary).toHaveBeenCalledWith(DASHBOARD_REF, {
      withFacts: true,
    });
  });

  it("renders the menu it is given in the header", () => {
    mocks.useDashboardSummary.mockReturnValue(AVAILABLE_DASHBOARD);
    render(
      <GadgetCard
        gadgetRef={DASHBOARD_REF}
        menu={<button type="button">Gadget actions</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Gadget actions" }),
    ).toBeInTheDocument();
  });
});
