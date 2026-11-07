/**
 * Tests for the per-type gadget summary hooks. Every client hook is mocked,
 * so each case controls exactly what the lookups return.
 */
import { formatDate } from "@avandar/utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  useConceptSummary,
  useDashboardSummary,
  useDashboardTileSummary,
  useDatasetSummary,
  useIndividualSummary,
  useMapSummary,
} from "@/components/RichText/Gadget/useGadgetSummaries/useGadgetSummaries";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { i18n } from "@/i18n/i18n";
import { renderHook, TestProviders } from "@/test-utils";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type {
  GadgetFact,
  GadgetSummary,
} from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";

const mocks = vi.hoisted(() => {
  return {
    useDashboardById: vi.fn(),
    useDatasetById: vi.fn(),
    useDatasetColumnCount: vi.fn(),
    useMapById: vi.fn(),
    useConceptById: vi.fn(),
    useIndividualById: vi.fn(),
    useIndividualCount: vi.fn(),
    useConceptAttributeCount: vi.fn(),
  };
});

vi.mock("@/clients/dashboards/DashboardClient/DashboardClient", () => {
  return { DashboardClient: { useGetById: mocks.useDashboardById } };
});
vi.mock("@/clients/datasets/DatasetClient/DatasetClient", () => {
  return { DatasetClient: { useGetById: mocks.useDatasetById } };
});
vi.mock("@/clients/datasets/DatasetColumnClient", () => {
  return { DatasetColumnClient: { useGetCount: mocks.useDatasetColumnCount } };
});
vi.mock("@/clients/maps/AvaMapClient/AvaMapClient", () => {
  return { AvaMapClient: { useGetById: mocks.useMapById } };
});
vi.mock("@/clients/ontology/ConceptClient", () => {
  return { ConceptClient: { useGetById: mocks.useConceptById } };
});
vi.mock("@/clients/ontology/IndividualClient", () => {
  return {
    IndividualClient: {
      useGetById: mocks.useIndividualById,
      useGetCount: mocks.useIndividualCount,
    },
  };
});
vi.mock("@/clients/ontology/ConceptAttributeClient", () => {
  return {
    ConceptAttributeClient: { useGetCount: mocks.useConceptAttributeCount },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { slug: "nyc-doh" };
    },
  };
});

const DASHBOARD_ID = "11111111-1111-4111-8111-111111111111";
const DATASET_ID = "22222222-2222-4222-8222-222222222222";
const MAP_ID = "33333333-3333-4333-8333-333333333333";
const CONCEPT_ID = "44444444-4444-4444-8444-444444444444";
const INDIVIDUAL_ID = "55555555-5555-4555-8555-555555555555";
const UPDATED_AT = "2026-10-28T12:00:00.000Z";
const UPDATED_LABEL = formatDate(UPDATED_AT, { format: "MMM D" });

const DASHBOARD_CONFIG = {
  root: { props: { title: "Measles" } },
  content: [
    {
      type: "DataViz",
      props: {
        id: "DataViz-top",
        nlQuery: { prompt: "Weekly cases" },
        vizType: "line",
      },
    },
    {
      type: "Grid",
      props: {
        id: "Grid-1",
        r1c1: [
          {
            type: "DataViz",
            props: { id: "DataViz-nested", nlQuery: {}, vizType: "bar" },
          },
        ],
      },
    },
  ],
};

const DASHBOARD = {
  id: DASHBOARD_ID,
  name: "Measles by borough",
  visibility: "workspace",
  isRestricted: false,
  updatedAt: UPDATED_AT,
  config: DASHBOARD_CONFIG,
};

function _ref(
  gadgetType: Gadget.Type,
  gadgetId: string,
  subId: string | null = null,
): Gadget.Ref {
  return { gadgetType, gadgetId, subId };
}

function _renderSummary(
  useSummary: (ref: Gadget.Ref) => GadgetSummary,
  ref: Gadget.Ref,
): GadgetSummary {
  return renderHook(
    () => {
      return useSummary(ref);
    },
    { wrapper: TestProviders },
  ).result.current;
}

/** Facts as translated `[label, value]` pairs, to compare in one assertion. */
function _factPairs(summary: GadgetSummary): Array<[string, string]> {
  if (summary.status !== "available") {
    return [];
  }
  return summary.facts.map((fact: GadgetFact) => {
    return [i18n._(fact.label), fact.value];
  });
}

beforeEach(() => {
  Object.values(mocks).forEach((mock) => {
    mock.mockReset();
    mock.mockReturnValue([undefined, false]);
  });
});

describe("useDashboardSummary", () => {
  it("summarizes a dashboard that the reader can open", () => {
    mocks.useDashboardById.mockReturnValue([DASHBOARD, false]);
    const summary = _renderSummary(
      useDashboardSummary,
      _ref("dashboard", DASHBOARD_ID),
    );
    expect(summary).toMatchObject({
      status: "available",
      name: "Measles by borough",
      link: {
        to: "/$workspaceSlug/dashboards/preview/$dashboardId",
        params: { workspaceSlug: "nyc-doh", dashboardId: DASHBOARD_ID },
      },
    });
    expect(_factPairs(summary)).toEqual([
      ["Tiles", "2"],
      ["Audience", "Workspace"],
      ["Updated", UPDATED_LABEL],
    ]);
  });

  it("is loading while the dashboard is fetched", () => {
    mocks.useDashboardById.mockReturnValue([undefined, true]);
    expect(
      _renderSummary(useDashboardSummary, _ref("dashboard", DASHBOARD_ID)),
    ).toEqual({ status: "loading" });
  });

  it("is unavailable when no dashboard row comes back", () => {
    expect(
      _renderSummary(useDashboardSummary, _ref("dashboard", DASHBOARD_ID)),
    ).toEqual({ status: "unavailable" });
  });
});

describe("useDashboardTileSummary", () => {
  it("names a tile after its prompt and links to it on the dashboard", () => {
    mocks.useDashboardById.mockReturnValue([DASHBOARD, false]);
    const summary = _renderSummary(
      useDashboardTileSummary,
      _ref("dashboard_tile", DASHBOARD_ID, "DataViz-top"),
    );
    expect(summary).toMatchObject({
      status: "available",
      name: "Weekly cases",
      link: {
        to: "/$workspaceSlug/dashboards/preview/$dashboardId",
        params: { workspaceSlug: "nyc-doh", dashboardId: DASHBOARD_ID },
        search: { tile: "DataViz-top" },
      },
    });
    expect(_factPairs(summary)).toEqual([
      ["Dashboard", "Measles by borough"],
      ["Chart", "Line Chart"],
      ["Updated", UPDATED_LABEL],
    ]);
  });

  it("names a tile without a prompt Untitled chart", () => {
    mocks.useDashboardById.mockReturnValue([DASHBOARD, false]);
    const summary = _renderSummary(
      useDashboardTileSummary,
      _ref("dashboard_tile", DASHBOARD_ID, "DataViz-nested"),
    );
    expect(summary).toMatchObject({
      status: "available",
      name: "Untitled chart",
      link: { search: { tile: "DataViz-nested" } },
    });
  });

  it("is unavailable when the dashboard no longer holds the tile", () => {
    mocks.useDashboardById.mockReturnValue([DASHBOARD, false]);
    expect(
      _renderSummary(
        useDashboardTileSummary,
        _ref("dashboard_tile", DASHBOARD_ID, "DataViz-gone"),
      ),
    ).toEqual({ status: "unavailable" });
  });
});

describe("useDatasetSummary", () => {
  it("summarizes a dataset with its source and column count", () => {
    mocks.useDatasetById.mockReturnValue([
      {
        id: DATASET_ID,
        name: "Borough boundaries",
        sourceType: "csv_file",
        updatedAt: UPDATED_AT,
      },
      false,
    ]);
    mocks.useDatasetColumnCount.mockReturnValue([4, false]);
    const summary = _renderSummary(
      useDatasetSummary,
      _ref("dataset", DATASET_ID),
    );
    const appLink = AppLinks.dataManagerDatasetView({
      workspaceSlug: "nyc-doh",
      datasetId: DATASET_ID,
      datasetName: "Borough boundaries",
    });
    expect(summary).toMatchObject({
      status: "available",
      name: "Borough boundaries",
      link: { to: appLink.to, params: appLink.params },
    });
    expect(_factPairs(summary)).toEqual([
      ["Source", "CSV file"],
      ["Columns", "4"],
      ["Updated", UPDATED_LABEL],
    ]);
    expect(mocks.useDatasetColumnCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { dataset_id: { eq: DATASET_ID } } }),
    );
  });

  it("is loading while the column count is fetched", () => {
    mocks.useDatasetById.mockReturnValue([
      { id: DATASET_ID, name: "Borough boundaries", sourceType: "csv_file" },
      false,
    ]);
    mocks.useDatasetColumnCount.mockReturnValue([undefined, true]);
    expect(
      _renderSummary(useDatasetSummary, _ref("dataset", DATASET_ID)),
    ).toEqual({ status: "loading" });
  });
});

describe("useMapSummary", () => {
  it("summarizes a map with its layer count", () => {
    mocks.useMapById.mockReturnValue([
      {
        id: MAP_ID,
        name: "Exposure sites",
        updatedAt: UPDATED_AT,
        config: { layers: [{}, {}, {}] },
      },
      false,
    ]);
    const summary = _renderSummary(useMapSummary, _ref("map", MAP_ID));
    const appLink = AppLinks.mapEditor({
      workspaceSlug: "nyc-doh",
      mapId: MAP_ID,
    });
    expect(summary).toMatchObject({
      status: "available",
      name: "Exposure sites",
      link: { to: appLink.to, params: appLink.params },
    });
    expect(_factPairs(summary)).toEqual([
      ["Layers", "3"],
      ["Updated", UPDATED_LABEL],
    ]);
  });
});

describe("useConceptSummary", () => {
  it("summarizes a case type with its record and field counts", () => {
    mocks.useConceptById.mockReturnValue([
      { id: CONCEPT_ID, name: "Measles case" },
      false,
    ]);
    mocks.useIndividualCount.mockReturnValue([38, false]);
    mocks.useConceptAttributeCount.mockReturnValue([6, false]);
    const summary = _renderSummary(
      useConceptSummary,
      _ref("concept", CONCEPT_ID),
    );
    const appLink = AppLinks.individualManagerHome({
      workspaceSlug: "nyc-doh",
      conceptId: CONCEPT_ID,
      conceptName: "Measles case",
    });
    expect(summary).toMatchObject({
      status: "available",
      name: "Measles case",
      link: { to: appLink.to, params: appLink.params },
    });
    expect(_factPairs(summary)).toEqual([
      ["Records", "38"],
      ["Fields", "6"],
    ]);
    expect(mocks.useIndividualCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { concept_id: { eq: CONCEPT_ID } } }),
    );
    expect(mocks.useConceptAttributeCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: { concept_id: { eq: CONCEPT_ID } } }),
    );
  });
});

describe("useIndividualSummary", () => {
  it("summarizes a case with its status and case type", () => {
    mocks.useIndividualById.mockReturnValue([
      {
        id: INDIVIDUAL_ID,
        name: "Amara Okafor",
        status: "Suspected",
        conceptId: CONCEPT_ID,
        updatedAt: UPDATED_AT,
      },
      false,
    ]);
    mocks.useConceptById.mockReturnValue([
      { id: CONCEPT_ID, name: "Measles case" },
      false,
    ]);
    const summary = _renderSummary(
      useIndividualSummary,
      _ref("individual", INDIVIDUAL_ID),
    );
    const appLink = AppLinks.individualManagerIndividualView({
      workspaceSlug: "nyc-doh",
      conceptId: CONCEPT_ID,
      individualId: INDIVIDUAL_ID,
      individualName: "Amara Okafor",
    });
    expect(summary).toMatchObject({
      status: "available",
      name: "Amara Okafor",
      link: { to: appLink.to, params: appLink.params },
    });
    expect(_factPairs(summary)).toEqual([
      ["Status", "Suspected"],
      ["Case type", "Measles case"],
      ["Updated", UPDATED_LABEL],
    ]);
  });

  it("is unavailable when no case row comes back", () => {
    expect(
      _renderSummary(useIndividualSummary, _ref("individual", INDIVIDUAL_ID)),
    ).toEqual({ status: "unavailable" });
  });
});
