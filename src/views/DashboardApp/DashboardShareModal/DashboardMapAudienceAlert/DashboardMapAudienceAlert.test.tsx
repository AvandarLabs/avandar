import { beforeEach, describe, expect, it, vi } from "vitest";
import { AvaMapConfig } from "$/models/AvaMap/AvaMapConfig/AvaMapConfig";
import { render, screen } from "@/test-utils";
import { DashboardMapAudienceAlert } from "@/views/DashboardApp/DashboardShareModal/DashboardMapAudienceAlert/DashboardMapAudienceAlert";
import type { Dashboard } from "$/models/Dashboard/Dashboard";

const { useGetMapsMock } = vi.hoisted(() => {
  return { useGetMapsMock: vi.fn() };
});

vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return { AvaMapClient: { useGetAll: useGetMapsMock } };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return {
    DatasetClient: {
      useGetAll: () => {
        return [[], false];
      },
    },
  };
});

const MAP_ID = "00000000-0000-4000-8000-0000000000f5";
const OTHER_MAP_ID = "00000000-0000-4000-8000-0000000000f6";
const DASHBOARD = {
  id: "00000000-0000-4000-8000-000000000001",
  workspaceId: "00000000-0000-4000-8000-000000000002",
  config: {
    root: { props: { title: "Coverage" } },
    content: [{ type: "Map", props: { id: "Map-1", mapId: MAP_ID } }],
  },
} as unknown as Dashboard.T;
const RESTRICTED_MAP = {
  id: MAP_ID,
  name: "Case homes",
  isRestricted: true,
  config: AvaMapConfig.makeEmpty(),
};

describe("DashboardMapAudienceAlert", () => {
  beforeEach(() => {
    useGetMapsMock.mockReturnValue([[RESTRICTED_MAP], false]);
  });

  it("warns that some readers cannot open a restricted map", () => {
    render(
      <DashboardMapAudienceAlert
        dashboard={DASHBOARD}
        targetVisibility="workspace"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /cannot open Case homes/,
    );
  });

  it("counts the maps the author cannot open in one phrase", () => {
    useGetMapsMock.mockReturnValue([[], false]);
    const dashboard = {
      ...DASHBOARD,
      config: {
        root: { props: { title: "Coverage" } },
        content: [
          { type: "Map", props: { id: "Map-1", mapId: MAP_ID } },
          { type: "Map", props: { id: "Map-2", mapId: OTHER_MAP_ID } },
        ],
      },
    } as unknown as Dashboard.T;

    render(
      <DashboardMapAudienceAlert
        dashboard={dashboard}
        targetVisibility="workspace"
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /cannot open 2 maps hidden from you\./,
    );
  });

  it("stays quiet for a public dashboard, whose maps are published as snapshots", () => {
    render(
      <DashboardMapAudienceAlert
        dashboard={DASHBOARD}
        targetVisibility="public"
      />,
    );

    expect(screen.queryByText(/cannot open/)).not.toBeInTheDocument();
  });

  it("stays quiet while the maps are loading", () => {
    useGetMapsMock.mockReturnValue([undefined, true]);

    render(
      <DashboardMapAudienceAlert
        dashboard={DASHBOARD}
        targetVisibility="workspace"
      />,
    );

    expect(screen.queryByText(/cannot open/)).not.toBeInTheDocument();
  });
});
