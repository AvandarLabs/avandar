/**
 * Module stubs for the collaborators the transition tests never exercise.
 * They hold no shared state, so they live apart from the mock bundle.
 */
import { vi } from "vitest";
import { DATASET_IDS } from "@/clients/dashboards/DashboardClient/__tests__/dashboardTransitionConstants";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

vi.mock(
  "@/clients/dashboards/getDatasetIdsFromDashboardConfig/getDatasetIdsFromDashboardConfig",
  () => {
    return {
      getDatasetIdsFromDashboardConfig: () => {
        return DATASET_IDS;
      },
    };
  },
);

vi.mock(
  "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder",
  () => {
    return {
      DashboardSliceBuilder: {
        DEFAULT: { mode: "all_columns" },
        buildSliceSql: vi.fn(),
        extractReferencedColumns: () => {
          return { perDataset: {}, unparseable: new Set<Dataset.Id>() };
        },
        readDashboardPublishConfig: () => {
          return { slices: {} };
        },
        writeDashboardPublishConfig: ({
          dashboardConfig,
        }: Readonly<{
          dashboardConfig: Dashboard.T["config"];
        }>) => {
          return dashboardConfig;
        },
      },
    };
  },
);

vi.mock("@/clients/datasets/LocalDatasetClient/LocalDatasetClient", () => {
  return {
    LocalDatasetClient: {
      getById: vi.fn().mockResolvedValue({
        parseStatus: "ready",
        parquetData: new Blob(["open-data-parquet"]),
      }),
    },
  };
});

vi.mock("@/clients/datasets/source-datasets/VirtualDatasetClient", () => {
  return {
    VirtualDatasetClient: {
      getOne: vi.fn().mockResolvedValue({ rawSql: "SELECT 1" }),
    },
  };
});

vi.mock("@/clients/qetl/WorkspaceQetlClient/WorkspaceQetlClient", () => {
  return {
    WorkspaceQetlClient: {
      runQuery: vi.fn().mockResolvedValue(new Blob(["query-parquet"])),
    },
  };
});

vi.mock("@/utils/notifications/notify", () => {
  return { notifyError: vi.fn() };
});
