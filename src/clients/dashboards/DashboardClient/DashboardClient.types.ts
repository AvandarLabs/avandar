import type { DashboardSliceBuilder } from "@/clients/dashboards/DashboardSliceBuilder/DashboardSliceBuilder";
import type {
  PublishedVisibility,
  SnapshotBucketName,
} from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { PublishSliceConfig } from "@/models/Dashboard/PublishSliceConfig/PublishSliceConfig";
import type { ILogger } from "@avandar/logger";
import type { DashboardSlugValidationFailure } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types";
import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type { DashboardParsers } from "$/models/Dashboard/DashboardParsers";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { AvaSupabaseDBClient } from "$/types/AvaSupabaseDbClient.types";

/** The client wiring that `createRdbCrudClient` hands to the mutations. */
export type DashboardMutationConfig = {
  clientLogger: ILogger;
  dbClient: AvaSupabaseDBClient;
  parsers: typeof DashboardParsers;
};

/**
 * The mutation config plus the client reads a mutation may perform.
 *
 * Those reads are injected rather than imported so the publish, transition,
 * and cleanup units do not have to import the client they are wired into.
 */
export type DashboardMutationContext = DashboardMutationConfig & {
  getDashboardById: (
    dashboardId: Dashboard.Id,
  ) => Promise<Dashboard.T | undefined>;
  validateDashboardSlug: (
    options: Readonly<{
      slug: string;
      visibility: PublishedVisibility;
      dashboardId?: Dashboard.Id;
    }>,
  ) => Promise<{ isValid: true } | DashboardSlugValidationFailure>;
};

/** Parameters for publishing a dashboard at a given visibility. */
export type PublishDashboardParams = {
  dashboardId: Dashboard.Id;
  visibility: PublishedVisibility;
  slug?: { action: "set"; value: string } | { action: "clear" };
  publishConfig?: PublishSliceConfig.Dashboard;
};

/** The datasets a dashboard's published snapshot depends on. */
export type PublishDatasets = {
  datasets: Dataset.T[];
  datasetIds: Dataset.Id[];
};

/** Everything a publish needs before it starts writing snapshot objects. */
export type PreparedPublishSnapshot = PublishDatasets & {
  columnsByDataset: Record<string, string[]>;
  publishConfig: PublishSliceConfig.Dashboard;
  referenced: ReturnType<typeof DashboardSliceBuilder.extractReferencedColumns>;
};

/** Options for staging a publish snapshot into its bucket. */
export type StagePublishSnapshotOptions = {
  bucket: SnapshotBucketName;
  dashboard: Dashboard.T;
  logger: ILogger;
  prepared: PreparedPublishSnapshot;
  visibility: PublishedVisibility;
};

/** Options for committing a staged publish onto the dashboard row. */
export type PublishCommitOptions = {
  claimedDashboard: Dashboard.T;
  dashboardId: Dashboard.Id;
  logger: ILogger;
  snapshotRevision: string;
  updateModel: Partial<Dashboard.T>;
  visibility: PublishedVisibility;
};

/** The dashboard mutations layered on top of the generated CRUD client. */
export type DashboardMutations = {
  publishDashboard: (
    params: Readonly<PublishDashboardParams>,
  ) => Promise<Dashboard.T>;
  validateDashboardSlug: (
    options: Readonly<{
      slug: string;
      visibility: PublishedVisibility;
      dashboardId?: Dashboard.Id;
    }>,
  ) => Promise<{ isValid: true } | DashboardSlugValidationFailure>;
  unpublishDashboard: (
    params: Readonly<{ dashboardId: Dashboard.Id }>,
  ) => Promise<Dashboard.T>;
  fullDelete: (params: Readonly<{ id: Dashboard.Id }>) => Promise<void>;
};
