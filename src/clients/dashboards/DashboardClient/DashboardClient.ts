import type { Dashboard } from "$/models/Dashboard/Dashboard";
import type {
  DashboardMutationConfig,
  DashboardMutationContext,
  DashboardMutations,
  PublishDashboardParams,
} from "@/clients/dashboards/DashboardClient/DashboardClient.types";
import type { PublishedVisibility } from "@/clients/storage/PublicDatasetParquetStorageClient/SnapshotStorageUtils/SnapshotStorageUtils";
import type { DashboardSlugValidationFailure } from "@sbfn/dashboards/DashboardsRoutes/DashboardsRoutes.types";

import { omit } from "@avandar/utils";

import { DashboardParsers } from "$/models/Dashboard/DashboardParsers";
import { createRdbCrudClient } from "$/RdbCrudClient/createRdbCrudClient";
import { APIClient } from "@/clients/APIClient";
import { publishDashboard } from "@/clients/dashboards/DashboardClient/publishDashboard";
import {
  fullDeleteDashboard,
  unpublishDashboard,
} from "@/clients/dashboards/DashboardClient/unpublishDashboard";
import { createUsableServiceClient } from "@/utils/createUsableServiceClient";

type ValidateDashboardSlugOptions = {
  config: DashboardMutationConfig;
  dashboardId?: Dashboard.Id;
  slug: string;
  visibility: PublishedVisibility;
};

async function _validateDashboardSlug(
  options: Readonly<ValidateDashboardSlugOptions>,
): Promise<{ isValid: true } | DashboardSlugValidationFailure> {
  const logger = options.config.clientLogger.appendName(
    "validateDashboardSlug",
  );
  logger.log("Checking dashboard slug availability", options);
  return APIClient.post({
    route: "dashboards/validate-slug",
    body: {
      slug: options.slug,
      dashboardId: options.dashboardId,
      visibility: options.visibility,
    },
  });
}

function _createDashboardMutations(
  config: Readonly<DashboardMutationConfig>,
): DashboardMutations {
  // The reads are resolved lazily through the exported client so the mutation
  // units never have to import the client they are wired into.
  const context: DashboardMutationContext = {
    ...config,
    getDashboardById: async (dashboardId) => {
      return await DashboardClient.getById({ id: dashboardId });
    },
    validateDashboardSlug: async (options) => {
      return await DashboardClient.validateDashboardSlug(options);
    },
  };
  return {
    publishDashboard: async (
      params: Readonly<PublishDashboardParams>,
    ): Promise<Dashboard.T> => {
      return await publishDashboard({ context, params });
    },
    validateDashboardSlug: async (
      options: Readonly<{
        slug: string;
        visibility: PublishedVisibility;
        dashboardId?: Dashboard.Id;
      }>,
    ): Promise<{ isValid: true } | DashboardSlugValidationFailure> => {
      return await _validateDashboardSlug({ config, ...options });
    },
    unpublishDashboard: async (
      params: Readonly<{ dashboardId: Dashboard.Id }>,
    ): Promise<Dashboard.T> => {
      return await unpublishDashboard({
        context,
        dashboardId: params.dashboardId,
      });
    },
    fullDelete: async (
      params: Readonly<{ id: Dashboard.Id }>,
    ): Promise<void> => {
      await fullDeleteDashboard({ context, dashboardId: params.id });
    },
  };
}

const DashboardCrudClient = createRdbCrudClient({
  modelName: "Dashboard",
  tableName: "dashboards",
  dbTablePrimaryKey: "id",
  parsers: DashboardParsers,
  // dbClient is now injected by createRdbCrudClient; nothing to pass here
  mutations: _createDashboardMutations,
});

const DashboardClientWithRawDelete = createUsableServiceClient(
  DashboardCrudClient,
  {
    mutationFns: [
      "publishDashboard",
      "unpublishDashboard",
      "validateDashboardSlug",
      "fullDelete",
    ],
  },
);

export const DashboardClient = omit(DashboardClientWithRawDelete, [
  "bulkDelete",
  "delete",
  "useBulkDelete",
  "useDelete",
]);
