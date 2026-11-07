/**
 * Shared fixtures for the gadget summary hook tests: the mocked client
 * hooks, the ids and sample dashboard they return, and helpers that render a
 * summary hook and read its facts. Importing this file also resets the
 * mocks before each test.
 */
import { formatDate } from "@avandar/utils";
import { beforeEach, vi } from "vitest";
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
  GadgetDefinition,
  GadgetFact,
  GadgetSummary,
} from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";

const { WORKSPACE_ID } = vi.hoisted(() => {
  return { WORKSPACE_ID: "00000000-0000-4000-8000-000000000000" };
});

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
      return { id: WORKSPACE_ID, slug: "nyc-doh" };
    },
  };
});

const OTHER_WORKSPACE_ID = "99999999-9999-4999-8999-999999999999";
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
          {
            type: "DataViz",
            props: { id: "DataViz-future", vizType: "sankey" },
          },
        ],
      },
    },
  ],
};

const DASHBOARD = {
  id: DASHBOARD_ID,
  workspaceId: WORKSPACE_ID,
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
  useSummary: GadgetDefinition["useGadgetSummary"],
  ref: Gadget.Ref,
  options: { withFacts: boolean } = { withFacts: true },
): GadgetSummary {
  return renderHook(
    () => {
      return useSummary(ref, options);
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

export const GadgetSummariesTestFixtures = {
  useConceptSummary,
  useDashboardSummary,
  useDashboardTileSummary,
  useDatasetSummary,
  useIndividualSummary,
  useMapSummary,
  AppLinks,
  mocks,
  WORKSPACE_ID,
  OTHER_WORKSPACE_ID,
  DASHBOARD_ID,
  DATASET_ID,
  MAP_ID,
  CONCEPT_ID,
  INDIVIDUAL_ID,
  UPDATED_AT,
  UPDATED_LABEL,
  DASHBOARD,
  _ref,
  _renderSummary,
  _factPairs,
};
